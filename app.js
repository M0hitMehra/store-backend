import cookieParser from "cookie-parser";
import errorMiddleWare from "./middlewares/error.js";
import express from "express";
export const app = express();
import cors from "cors";
import bodyParser from "body-parser";

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(bodyParser.text({ limit: "200mb" }));

app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (
        origin === "http://localhost:3000" ||
        origin === "https://store-backend-0jpc.onrender.com/" ||
        origin === "https://store-4tfi.vercel.app"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// app.use(cors());
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import colorRoutes from "./routes/colorRoutes.js";
import sizeRoutes from "./routes/sizeRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";

app.use("/api/v1", productRoutes);
app.use("/api/v1/brand", brandRoutes);
app.use("/api/v1/color", colorRoutes);
app.use("/api/v1/size", sizeRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/auth", userRoutes);

app.get("/", (req, res) => {
  res.send(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>API Testing</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
        display:flex;
        justify-content:"space-between";
        gap: 1rem;
       }
      .container {
        margin-bottom: 20px;
        width: 50%;

      }
        .response-container{
        width: 50%;

        }
      .container label {
        display: block;
        margin-bottom: 5px;
      }
      .container input,
      .container button {
        padding: 8px;
        margin-bottom: 10px;
      }
      .api-link {
        display: block;
        margin: 10px 0;
        color: blue;
        cursor: pointer;
        text-decoration: underline;
      }
      pre {
        background-color: #f8f8f8;
        padding: 10px;
        border: 1px solid #ddd;
        margin-top: 20px;
      }
      .details {
        margin: 10px 0;
      }
      .details summary {
        cursor: pointer;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
  <div id="api-container">
  <h1>API Testing - (add after - https://store-backend-0jpc.onrender.com/api/v1 ) </h1>
      <details class="details">
        <summary>Create User (POST /api/v1/auth/register)</summary>
        <a class="api-link" data-method="POST" href="/api/v1/auth/register">Register User</a>
        <p>Body: { "firstName": "string", "lastName": "string", "email": "string", "password": "string" }</p>
      </details>
      <details class="details">
        <summary>Verify User (POST /api/v1/auth/verify)</summary>
        <a class="api-link" data-method="POST" href="/api/v1/auth/verify">Verify User (FOR OTP VERIFICATION)</a>
        <p>Body: { "otp": "number" }</p>
      </details>
      <details class="details">
        <summary>Get User (GET /api/v1/auth/user)</summary>
        <a class="api-link" data-method="GET" href="/api/v1/auth/user">Get User</a>
        <p>No parameters required</p>
      </details>
      <details class="details">
        <summary>Login User (POST /api/v1/auth/login)</summary>
        <a class="api-link" data-method="POST" href="/api/v1/auth/login">Login User</a>
        <p>Body: { "email": "string", "password": "string" }</p>
      </details>
      <details class="details">
        <summary>Logout User (GET /api/v1/auth/logout)</summary>
        <a class="api-link" data-method="GET" href="/api/v1/auth/logout">Logout User</a>
        <p>No parameters required</p>
      </details>
      <details class="details">
        <summary>Update Profile (POST /api/v1/auth/user/update)</summary>
        <a class="api-link" data-method="POST" href="/api/v1/auth/user/update">Update Profile</a>
        <p>Body: { "firstName": "string", "lastName": "string", "address": "string", "phone": "string" }</p>
      </details>
      <details class="details">
        <summary>Update Profile Image (POST /api/v1/auth/user/update/image)</summary>
        <a class="api-link" data-method="POST" href="/api/v1/auth/user/update/image">Update Profile Image</a>
        <p>Body: { "image": "base64string" }</p>
      </details>
      <details class="details">
        <summary>Reset Password (PUT /api/v1/auth/user/reset/:token)</summary>
        <a class="api-link" data-method="PUT" href="/api/v1/auth/user/reset/:token">Reset Password</a>
        <p>Params: { "token": "string" }<br>Body: { "password": "string", "confirmPassword": "string" }</p>
      </details>
      <details class="details">
        <summary>Delete User (DELETE /api/v1/auth/user/delete)</summary>
        <a class="api-link" data-method="DELETE" href="/api/v1/auth/user/delete">Delete User</a>
        <p>No parameters required</p>
      </details>
    </div>
    <div id="response-container">
      <h2>API Response</h2>
      <pre id="api-response"></pre>
    </div>
    <script>
      document.querySelectorAll(".api-link").forEach((link) => {
        link.addEventListener("click", async (event) => {
          event.preventDefault();
          const method = link.getAttribute("data-method");
          const url = link.getAttribute("href");
          const options = { method, credentials: "include" };
          let bodyData = null;

          switch(url) {
            case '/api/v1/auth/register':
              bodyData = { firstName: "John", lastName: "Doe", email: "john.doe@example.com", password: "password123" };
              break;
            case '/api/v1/auth/verify':
              bodyData = { otp: 123456 };
              break;
            case '/api/v1/auth/login':
              bodyData = { email: "john.doe@example.com", password: "password123" };
              break;
            case '/api/v1/auth/user/update':
              bodyData = { firstName: "John", lastName: "Doe", address: "123 Street", phone: "1234567890" };
              break;
            case '/api/v1/auth/user/update/image':
              bodyData = { image: "base64imagestring" };
              break;
            case '/api/v1/auth/user/reset/:token':
              bodyData = { password: "newpassword123", confirmPassword: "newpassword123" };
              break;
            default:
              bodyData = null;
          }

          if (method === "POST" || method === "PUT") {
            options.headers = { "Content-Type": "application/json" };
            if (bodyData) options.body = JSON.stringify(bodyData);
          }

          const response = await fetch(url, options);
          const result = await response.json();
          document.getElementById("api-response").textContent = JSON.stringify(result, null, 2);
        });
      });
    </script>
  </body>
</html>`
  );
});

app.use(errorMiddleWare);
