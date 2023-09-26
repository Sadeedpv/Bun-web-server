import { Elysia, t } from "elysia";
import { Database } from "bun:sqlite";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";

type User = {
  userId: number;
  username: string;
  password: string;
}[];

type SingleUser = {
  userId: number;
  username?: string;
  password?: string;
};

export type Message = {
  id: number;
  messageId: number;
  message: string;
  done: boolean;
}[];

let flag: string;

export const app = new Elysia();
app.use(
  cors({
    origin: ["http://localhost:8000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: "*",
    exposedHeaders: "*",
  })
);
app.use(
  jwt({
    name: "jwt",
    secret: "sasljhsal2j3hj32",
  })
);
// Error Handling
app.onError(({ code, error }) => {
  return new Response(error.toString(), {
    status: 500, // Internal Server Error
  });
});

// DB Config
// Create DB If not Exists
const DB = new Database("mydb.sqlite", { create: true });

try {
  DB.query(
    `CREATE TABLE IF NOT EXISTS USERS(
      userId INTEGER PRIMARY KEY,
      username VARCHAR(30) NOT NULL,
      password TEXT NOT NULL
    );`
  ).run();
  DB.query(
    `CREATE TABLE IF NOT EXISTS MESSAGES(
    id INTEGER,
    messageId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    message TEXT NOT NULL,
    done BOOLEAN NOT NULL CHECK(done IN (0, 1)),
    FOREIGN KEY(id) REFERENCES USERS(userId)
  );`
  ).run();
} catch (err) {
  console.log("Error has occured: ", err);
  process.exit(1);
}

// Routes

// User Routes
app.post(
  "/register",
  async ({ body }) => {
    const username = body.username;
    const password = body.password;
    if (!username || !password) {
      return new Response(
        JSON.stringify({
          error: "Empty JSON fields",
        }),
        {
          status: 400,
        }
      );
    }
    // Check if an user already exists
    let userExists = DB.prepare("SELECT * FROM USERS WHERE username=?1").get(
      username
    ) as SingleUser | undefined;
    if (userExists?.username == username) {
      return new Response(
        JSON.stringify({
          error: "User already Exists",
        }),
        {
          status: 400,
        }
      );
    }
    const hashedPassword = await Bun.password.hash(password);
    const query = DB.query(
      "INSERT INTO USERS(username, password) VALUES (?1, ?2);"
    );
    query.run(username, hashedPassword);
    return new Response(JSON.stringify({ messages: `Registered as ${username}` }), {
      headers: { "Content-Type": "application/json" },
    });
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
  }
);

app.post(
  "/login",
  async ({ body, jwt, set, cookie: { auth } }) => {
    const username = body.username;
    const password = body.password;
    let userExists = DB.prepare("SELECT * FROM USERS WHERE username = ?1").all(
      username
    ) as User;
    if (userExists.length == 0) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          error: "Wrong username",
        })
      );
    }
    const isMatch = await Bun.password.verify(
      password,
      userExists[0]?.password || ""
    );
    if (!isMatch) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          error: "Wrong password",
        })
      );
    }

    const profile = {
      userId: userExists[0].userId,
      username: userExists[0].username,
    };
    const token = await jwt.sign(profile);
    flag = token;
    auth.set({
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      domain: "localhost",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    set.status = 200;
    return new Response(
      JSON.stringify({
        message: `Logged in as ${username}`,
        cookie: auth.value,
      })
    );
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
    cookie: t.Cookie({
      value: t.Optional(t.String()),
    }),
  }
);
// Message Routes

app.get(
  "/messages",
  async ({ set, jwt, cookie: { auth } }) => {
    const profile: SingleUser = await jwt.verify(flag);
    console.log(profile);
    if (!profile) {
      set.status = 401;
      return new Response(
        JSON.stringify({
          error: "Please login!",
          cookie: profile,
        })
      );
    }
    const query = DB.query(`SELECT * FROM MESSAGES WHERE id=?1;`);
    const result = query.all(profile?.userId || 0);
    console.log(result);

    return new Response(JSON.stringify({ messages: result }), {
      headers: { "Content-Type": "application/json" },
    });
  },
  {
    cookie: t.Cookie({
      value: t.Optional(t.String()),
    }),
  }
);

app.post(
  "/add",
  async ({ body, jwt, cookie: { auth } }) => {
    const profile: SingleUser = await jwt.verify(flag);
    console.log(profile);
    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Please login!",
          cookie: profile,
        }),
        {
          status: 401,
        }
      );
    }
    const message = body?.message;
    const done = body?.done;

    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Empty JSON fields",
        }),
        {
          status: 400,
        }
      );
    }

    const query = DB.query(
      `INSERT INTO MESSAGES (id, message, done) VALUES (?1, ?2, ?3);`
    );
    query.run(profile?.userId, message, done);
    return new Response(JSON.stringify({ message: "Data Added!" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
  {
    body: t.Object({
      message: t.String(),
      done: t.Integer(),
    }),
  }
);

app.put(
  "/update/:id",
  async ({ body, params, set, jwt, cookie: { auth } }) => {
    const profile: SingleUser = await jwt.verify(flag);
    console.log(profile);
    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Please login!",
          cookie: profile,
        }),
        {
          status: 401,
        }
      );
    }
    const id = params.id;
    const message = body.message;
    const done = body.done;
    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Empty JSON fields",
        }),
        {
          status: 400,
        }
      )
    }
    const query = DB.query("SELECT * FROM MESSAGES WHERE messageId = ?1 AND id = ?2;");
    if (query.all(id, profile.userId).length === 0) {
      set.status = 400;
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
      "UPDATE MESSAGES SET message=?1, done=?2 WHERE messageId = ?3 AND id = ?4;"
    );
    updateQuery.run(message, done, id, profile.userId);
    set.status = 200;
    let updatedData = query.get(id, profile.userId);
    return new Response(
      JSON.stringify({
        message: updatedData,
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
      done: t.Integer(),
    }),
  }
);

app.delete("/delete/:id", async ({ params, set, jwt, cookie: { auth } }) => {
  const profile: SingleUser = await jwt.verify(flag);
  console.log(profile);
  if (!profile) {
    return new Response(
      JSON.stringify({
        error: "Please login!",
        cookie: profile,
      }),
      {
        status: 401,
      }
    );
  }
  const id = params.id;
  const query = DB.query("SELECT * FROM MESSAGES WHERE messageId = ?1 AND ID = ?2;");
  let deletedData = query.all(id, profile.userId)[0];
  if (query.all(id, profile.userId).length === 0) {
    set.status = 400;
    return new Response(
      JSON.stringify({ message: "Wrong parameter! Nothing to delete here" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const deleteQuery = DB.query("DELETE FROM MESSAGES WHERE messageId = ?1 AND ID = ?2;");
  deleteQuery.run(id, profile.userId);
  set.status = 200;
  return new Response(
    JSON.stringify({
      message: deletedData,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});

app.delete("/delete", async ({ set, jwt, cookie: { auth } }) => {
  const profile: SingleUser = await jwt.verify(flag);
  console.log(profile);
  if (!profile) {
    return new Response(
      JSON.stringify({
        error: "Please login!",
        cookie: profile,
      }),
      {
        status: 401,
      }
    );
  }
  const query = DB.query("SELECT * FROM MESSAGES WHERE ID = ?1;");
  if (query.all(profile.userId).length === 0) {
    set.status = 404;
    return new Response(
      JSON.stringify({ message: "Database is Empty! Nothing to delete" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  DB.prepare("DELETE FROM MESSAGES WHERE ID = ?1;").run(profile.userId);
  set.status = 200;
  return new Response(JSON.stringify({ message: "Database deleted!" }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
});

app.patch(
  "/patchdone/:id",
  async ({ body, params, set, jwt, cookie: { auth } }) => {
    const profile: SingleUser = await jwt.verify(flag);
    console.log(profile);
    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Please login!",
          cookie: profile,
        }),
        {
          status: 401,
        }
      );
    }
    const id = params.id;
    const done = body.done;
    const query = DB.query("SELECT * FROM MESSAGES WHERE messageId = ?1 AND ID = ?2;");
    if (query.all(id, profile.userId).length === 0) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          message: "Wrong parameter! Nothing to update here",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    const patchQuery = DB.query("UPDATE MESSAGES SET done=?1 WHERE messageId = ?2 AND ID = ?3;");
    patchQuery.run(done, id, profile.userId);
    return new Response(JSON.stringify({ message: "Database updated!" }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
  {
    body: t.Object({
      done: t.Integer(),
    }),
  }
);

app.get("/hello/:name", ({ params: { name } }) => {
  return `Hello ${name}!`;
});

app.get("bye/:name", (context) => {
  context.set.status = 200;
  return `Bye ${context.params.name}!`;
});

let PORT = Bun.env.PORT || 8000;
app.listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
