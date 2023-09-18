import { Elysia } from "elysia";
import { Database } from 'bun:sqlite'
import { cors } from '@elysiajs/cors'

const app = new Elysia();
app.use(cors());

// DB Config

// Create DB If not Exists
const DB = new Database("mydb.sqlite", { create: true })

DB.query(`CREATE TABLE IF NOT EXISTS MESSAGES(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT
);`).run();

app.get('/', (context) => {
  const query = DB.query(`SELECT * FROM MESSAGES;`);
  const result = query.get();
  console.log(result)


  return new Response(JSON.stringify({ messages: result }), {
    headers: { "Content-Type": "application/json" },
  });
})


// Routes

app.post("/add", ({ body }: any) => {
  const message = body?.message
  console.log(body.message)
  const query = DB.query(`INSERT INTO MESSAGES (message) VALUES ('World')`);
  query.run();
  return new Response(JSON.stringify({ message: "Added" }), {
    headers: { "Content-Type": "application/json" },
  });
});

app.get("/hello/:name", (({ params: { name } }) => {
  return `Hello ${name}!`;
}));

app.listen(8000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
