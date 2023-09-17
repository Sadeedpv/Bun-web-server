import { Elysia } from "elysia";
import {Database} from 'bun:sqlite'

const app = new Elysia()

// DB Config

const DB = new Database("mydb.sqlite", {create:true})

app.get('/', (context) => {
  context.set.status = 200;
  const query = DB.query(`select "Hello Eliott" as message`);
  const result = query.get();


  return new Response(JSON.stringify({ message: result }), {
    headers: { "Content-Type": "application/json" },
  });
})


// Routes

app.get("/hello", () => {
  return "Hello!";
});

app.get("/hello/:name", (({ params: { name } }) => {
  return `Hello ${name}!`;
}));

app.listen(8000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
