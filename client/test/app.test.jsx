import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App, AuthForm } from "../src/main";
import { api } from "../src/api";
import {useEditor} from '@tiptap/react';
jest.mock("../src/api", () => ({ api: jest.fn() }));
jest.mock("@tiptap/react", () => ({
  useEditor: jest.fn(()=>null),
  EditorContent: () => null,
}));
jest.mock("@tiptap/starter-kit", () => ({ __esModule: true, default: {} }));
jest.mock("@tiptap/extension-placeholder", () => ({
  __esModule: true,
  default: { configure: () => ({}) },
}));
beforeEach(() => {jest.clearAllMocks();useEditor.mockReturnValue(null);});

test('dirty editor cancellation preserves saved title and supports keep editing',async()=>{
 signedInApi();render(<App/>);const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Edit Study plan'}));
 const title=screen.getByRole('textbox',{name:'Note title'});await user.clear(title);await user.type(title,'Unsaved title');await user.click(screen.getByRole('button',{name:'Cancel'}));
 expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard unsaved changes?');await user.click(screen.getByRole('button',{name:'Keep editing'}));expect(title).toHaveValue('Unsaved title');
 await user.click(screen.getByRole('button',{name:'Cancel'}));await user.click(screen.getByRole('button',{name:'Discard changes'}));
 expect(screen.getByRole('heading',{name:'Study plan'})).toBeInTheDocument();expect(api.mock.calls.some(([,options])=>options?.method==='PUT')).toBe(false);
});
test('saves a note through the API and returns to the dashboard',async()=>{
 useEditor.mockReturnValue({isActive:()=>false,getHTML:()=>'<p>Editor content</p>'});
 signedInApi((path,options)=>{if(path==='/notes'&&options?.method==='POST')return Promise.resolve({note:{...testNote,id:2,title:'New idea'}});});
 render(<App/>);const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'＋ Create a note'}));await user.type(screen.getByRole('textbox',{name:'Note title'}),'New idea');await user.click(screen.getByRole('button',{name:'Save note'}));
 expect(await screen.findByRole('heading',{name:'New idea'})).toBeInTheDocument();expect(api).toHaveBeenCalledWith('/notes',expect.objectContaining({method:'POST',body:JSON.stringify({title:'New idea',content:'<p>Editor content</p>'})}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Note saved.');await user.click(screen.getByRole('button',{name:'Dismiss notification'}));expect(screen.queryByText('✓ Note saved.')).not.toBeInTheDocument();
});

const testUser = { id: 1, name: "Warisha", email: "one@example.com" };
const testNote = {
  id: 1,
  title: "Study plan",
  content: "<p>React lessons</p>",
  updated_at: new Date().toISOString(),
};
function signedInApi(handler) {
  api.mockImplementation((path, options) => {
    if (path === "/auth/me") return Promise.resolve({ user: testUser });
    if (path === "/notes" && !options)
      return Promise.resolve({ notes: [testNote] });
    return handler?.(path, options) || Promise.resolve(null);
  });
}

test("delete dialog traps keyboard focus, Escape cancels and restores the opener", async () => {
  signedInApi();
  render(<App />);
  const user = userEvent.setup();
  const opener = await screen.findByRole("button", {
    name: "Delete Study plan",
  });
  await user.click(opener);
  expect(screen.getByRole("button", { name: "Keep note" })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Delete note" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
test("session expiry while deleting clears private UI before next sign in", async () => {
  signedInApi((path) => path === "/trash" ? Promise.resolve({notes:[]}) :
    Promise.reject(Object.assign(new Error("Expired"), { status: 401 })),
  );
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Delete Study plan" }),
  );
  await user.click(screen.getByRole("button", { name: "Delete note" }));
  expect(
    await screen.findByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("session ended");
});
test("profile and signout use current user and clear the workspace", async () => {
  signedInApi();
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /Warisha Personal workspace/ }),
  );
  expect(screen.getByText("one@example.com")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sign out ↗" }));
  expect(
    await screen.findByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
});
test("notes load failure supports retry without hiding the error", async () => {
  let calls = 0;
  api.mockImplementation((path) => {
    if (path === "/auth/me") return Promise.resolve({ user: testUser });
    if (path === "/notes") {
      calls++;
      return calls === 1
        ? Promise.reject(new Error("Database unavailable"))
        : Promise.resolve({ notes: [testNote] });
    }
  });
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: "Study plan" }),
  ).toBeInTheDocument();
});
test("signs in using entered credentials and reports errors", async () => {
  const onLogin = jest.fn();
  api.mockRejectedValueOnce(new Error("Email or password is incorrect."));
  render(<AuthForm onLogin={onLogin} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email address"), "one@example.com");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign in →" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect",
  );
  expect(onLogin).not.toHaveBeenCalled();
});
test("registration includes name and uses the signup API", async () => {
  api.mockResolvedValue({ user: { name: "Warisha" } });
  const onLogin = jest.fn();
  render(<AuthForm onLogin={onLogin} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Create an account" }));
  await user.type(screen.getByLabelText("Your name"), "Warisha");
  await user.type(screen.getByLabelText("Email address"), "one@example.com");
  await user.type(screen.getByLabelText("Password"), "MyStrongPass123!");
  await user.click(
    screen.getByRole("button", { name: "Create your account →" }),
  );
  await waitFor(() =>
    expect(onLogin).toHaveBeenCalledWith({ name: "Warisha" }),
  );
  expect(api.mock.calls[0][0]).toBe("/auth/signup");
});
test("loads private notes, searches and requires confirmation before deletion", async () => {
  api.mockImplementation((path) => {
    if (path === "/auth/me")
      return Promise.resolve({
        user: { id: 1, name: "Warisha", email: "one@example.com" },
      });
    if (path === "/notes")
      return Promise.resolve({
        notes: [
          {
            id: 1,
            title: "Study plan",
            content: "<p>React lessons</p>",
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: "Groceries",
            content: "Milk",
            updated_at: new Date().toISOString(),
          },
        ],
      });
    return Promise.resolve(null);
  });
  render(<App />);
  const user = userEvent.setup();
  expect(
    await screen.findByRole("heading", { name: "Study plan" }),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Search notes"), "React");
  expect(
    screen.queryByRole("heading", { name: "Groceries" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByLabelText("Delete Study plan"));
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  expect(api.mock.calls.some(([path]) => path === "/notes/1")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Delete note" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Study plan" }),
    ).not.toBeInTheDocument(),
  );
});


test('trash restores notes through the owned API and refreshes the dashboard',async()=>{
 let removed=true;
 api.mockImplementation((path,options)=>{
  if(path==='/auth/me')return Promise.resolve({user:testUser});
  if(path==='/notes')return Promise.resolve({notes:removed?[]:[testNote]});
  if(path==='/trash')return Promise.resolve({notes:removed?[testNote]:[]});
  if(path==='/notes/1/restore'&&options.method==='POST'){removed=false;return Promise.resolve(null);}
  return Promise.resolve(null);
 });
 render(<App/>);const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:/Trash/}));
 await user.click(await screen.findByRole('button',{name:'Restore Study plan'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Note restored.');
 await user.click(screen.getByRole('button',{name:/All notes/}));
 expect(await screen.findByRole('heading',{name:'Study plan'})).toBeInTheDocument();
});
test('rejects invalid backup files before making an import request',async()=>{
 signedInApi();render(<App/>);const user=userEvent.setup();const file=new File(['invalid'],'backup.json',{type:'application/json'});
 Object.defineProperty(file,'text',{value:()=>Promise.resolve('invalid')});
 await user.upload(await screen.findByLabelText('Import backup'),file);
 expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
 expect(api.mock.calls.some(([path])=>path==='/notes/import')).toBe(false);
});
