import { describe, expect, it, test } from "bun:test";
import { app } from "./src";

interface LogMessage {
  message: string;
  cookie: string;
}

interface Messages {
  messages: [];
}

interface ResponseMessage {
  message: {
    id: number;
    messageId: number;
    message: string;
    done: number;
  };
}

describe("Elysia bun server", () => {
  // User credentials
  const username = "Sadeedpv";
  const password = "123456";
  const wrongUsername = "pvdeedaS";
  const wrongPassword = "654321";
  const Message = "Hello World";
  const updatedMessage = "Hello World!!";

  // Basic unit tests
  it("Returns hello + params", async () => {
    const res = await app
      .handle(new Request("http://localhost:8000/hello/world"))
      .then((res) => res.text());
    expect(res).toBe("Hello world!");
  });
  it("Returns bye + params", async () => {
    const res = await app
      .handle(new Request("http://localhost:8000/bye/world"))
      .then((res) => res.text());
    expect(res).toBe("Bye world!");
  });

  // User Authentication

  // Registering a User
  it("Registers a user", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(JSON.stringify({ messages: `Registered as ${username}` }));
  });

  // Registering user with already existing username
  it("User Already Exists", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(JSON.stringify({ error: "User already Exists" }));
  });

  // Logging in a user
  it("Logging in a user", async () => {
    const res = (await app
      .handle(
        new Request("http://localhost:8000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        })
      )
      .then((res) => res.text())
      .then((text) => JSON.parse(text))) as LogMessage;
    expect(res.message).toBe(`Logged in as ${username}`);
    expect(res.cookie).toBeString;
  });

  // Logging user with wrong credentials
  it("Displays Password error message", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: wrongPassword,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(
      JSON.stringify({
        error: "Wrong password",
      })
    );
  });

  it("Displays Username error message", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: wrongUsername,
            password: wrongPassword,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(
      JSON.stringify({
        error: "Wrong username",
      })
    );
  });

  // Display messages
  // GET messages
  it("Displays message Array", async () => {
    const res = (await app
      .handle(new Request("http://localhost:8000/messages"))
      .then((res) => res.text())
      .then((text) => JSON.parse(text))) as Messages;
    expect(Array.isArray(res.messages)).toBe(true);
  });

  // POST messages
  it("Posts messages to DB", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: Message,
            done: 0,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(JSON.stringify({ message: "Data Added!" }));
  });

  // UPDATE messages
  it("Updates messages", async () => {
    const res = (await app
      .handle(
        new Request("http://localhost:8000/update/1", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: updatedMessage,
            done: 0,
          }),
        })
      )
      .then((res) => res.text())
      .then((text) => JSON.parse(text))) as ResponseMessage;
    expect(res?.message?.message).toBe(updatedMessage);
  });

  // Patch Messages
  it("Patch messages", async () => {
    const res = await app
      .handle(
        new Request("http://localhost:8000/patchdone/1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            done: 1,
          }),
        })
      )
      .then((res) => res.text());
    expect(res).toBe(JSON.stringify({ message: "Database updated!" }));
  });

  // DELETE messages
  it("Deletes messages", async () => {
    const res = (await app
      .handle(
        new Request("http://localhost:8000/delete/1", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
      .then((res) => res.text())
      .then((text) => JSON.parse(text))) as ResponseMessage;
    expect(res.message.message).toBe(updatedMessage);
  });
});
