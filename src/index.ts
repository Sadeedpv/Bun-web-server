import { Elysia, t } from "elysia";
import { Database } from "bun:sqlite";
import { cors } from "@elysiajs/cors";

const app = new Elysia();
app.use(cors());

// DB Config

// Create DB If not Exists
const DB = new Database("mydb.sqlite", { create: true });

DB.query(
  `CREATE TABLE IF NOT EXISTS MESSAGES(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT
);`
).run();

// Routes

app.get("/", (context) => {
  const query = DB.query(`SELECT * FROM MESSAGES;`);
  const result = query.all();
  console.log(result);
  context.set.status = 200;

  return new Response(JSON.stringify({ messages: result }), {
    headers: { "Content-Type": "application/json" },
  });
});

app.post(
  "/add",
  ({ body }) => {
    const message = body?.message;
    console.log(message);
    const query = DB.query(`INSERT INTO MESSAGES (message) VALUES (?1)`);
    query.run(message);
    return new Response(JSON.stringify({ message: "Added" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
  {
    body: t.Object({
      message: t.String(),
    }),
  }
);

app.get("/hello/:name", ({ params: { name } }) => {
  return `Hello ${name}!`;
});

app.get("bye/:name", (context) => {
  context.set.status = 200
  return `Hello ${context.params.name}`;
});

app.listen(Number(Bun.env.PORT));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
