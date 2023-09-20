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

app.put(
  "/update/:id",
  (context) => {
    const id = context.params.id;
    const message = context.body.message;
    const query = DB.query("SELECT * FROM MESSAGES WHERE ID =?1;");
    if (query.all(id).length === 0) {
      context.set.status = 400;
      return new Response(
        JSON.stringify({ message: "Wrong parameter! Nothing to update here" }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    const updateQuery = DB.query(
      "UPDATE MESSAGES SET message=?1 WHERE ID = ?2"
    );
    updateQuery.run(message, id);
    context.set.status = 200;
    return new Response(
      JSON.stringify({
        message: "Database updated",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
  {
    body: t.Object({
      message: t.String(),
    }),
  }
);

app.delete("/delete/:id", (context) => {
  const id = context.params.id;
  const query = DB.query("SELECT * FROM MESSAGES WHERE ID=?1;");
  if (query.all(id).length === 0) {
    context.set.status = 400;
    return new Response(
      JSON.stringify({ message: "Wrong parameter! Nothing to delete here" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  };
  const deleteQuery = DB.query("DELETE FROM MESSAGES WHERE ID=?1");
  deleteQuery.run(id);
  return new Response(
    JSON.stringify({
      message: "Successfully deleted!",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});

app.delete("/delete", (context) => {
  const query = DB.query("SELECT * FROM MESSAGES;");
  if (query.all().length === 0) {
    context.set.status = 404;
    return new Response(
      JSON.stringify({ message: "Database is Empty! Nothing to delete" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  DB.exec("DELETE FROM MESSAGES;");
  return new Response(
    JSON.stringify({ message: "Database deleted!" }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});

app.get("/hello/:name", ({ params: { name } }) => {
  return `Hello ${name}!`;
});

app.get("bye/:name", (context) => {
  context.set.status = 200;
  return `Hello ${context.params.name}`;
});

let PORT = Bun.env.PORT
if (PORT == ""){
  PORT = "8000"
}
app.listen(Number(PORT));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
