import { api } from "../src/api";
beforeEach(() => {
  global.fetch = jest.fn();
});
test("sends credentials and returns response data", async () => {
  fetch.mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ notes: [] }),
  });
  expect(await api("/notes")).toEqual({ notes: [] });
  expect(fetch).toHaveBeenCalledWith(
    "/api/notes",
    expect.objectContaining({ credentials: "same-origin" }),
  );
});
test("handles a no-content response without reading JSON", async () => {
  fetch.mockResolvedValue({ status: 204 });
  expect(await api("/notes/1", { method: "DELETE" })).toBeNull();
});
test("preserves unauthorized status and safe server message", async () => {
  fetch.mockResolvedValue({
    status: 401,
    ok: false,
    json: async () => ({ error: "Please sign in." }),
  });
  await expect(api("/notes")).rejects.toMatchObject({
    status: 401,
    message: "Please sign in.",
  });
});
test("gives useful errors for offline and non-JSON responses", async () => {
  fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(api("/notes")).rejects.toThrow("Unable to reach the server");
  fetch.mockResolvedValue({
    status: 502,
    json: async () => {
      throw new Error("HTML");
    },
  });
  await expect(api("/notes")).rejects.toMatchObject({
    status: 502,
    message: expect.stringContaining("unexpected response"),
  });
});
