# Adding MongoDB (Atlas) for persistence

By default this app stores articles and feedback **in server memory** —
they vanish on every restart or redeploy. Everything below is optional:
the app runs fine without it. Do this if you want generated articles and
feedback to actually persist.

## 1. Create a free cluster

1. Go to **[mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register)** and sign up (free).
2. Create a new project, then **Build a Database** → choose the **free M0** tier → pick any region close to you → Create.

## 2. Create a database user

1. In the setup wizard (or **Database Access** in the left sidebar): **Add New Database User**.
2. Choose **Password** auth, set a username and password (save these — you'll need them in the connection string).
3. Give it **Read and write to any database**.

## 3. Allow network access

1. **Network Access** in the left sidebar → **Add IP Address**.
2. For a demo project, choose **Allow Access from Anywhere** (`0.0.0.0/0`). For production use, restrict this to your host's IP range instead.

## 4. Get your connection string

1. Go to **Database** → **Connect** → **Drivers**.
2. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<username>` and `<password>` with the credentials from step 2. If your password has special characters, URL-encode them (e.g. `@` → `%40`).

## 5. Configure the backend

**Local development** — in `backend/.env`:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=content_generator
```

**Render (production)** — in your Web Service → **Environment**:
```
MONGO_URI = mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME = content_generator
```
Save — Render redeploys automatically.

## 6. Verify it's connected

Hit your backend's health endpoint directly in a browser or with curl:
```
GET https://<your-backend-url>/health
```
It now returns database status, e.g.:
```json
{
  "status": "ok",
  "database": { "backend": "mongodb", "connected": true, "detail": "Connected to content_generator." }
}
```
If `connected` is `false`, the `detail` field will show the actual driver
error (bad password, IP not whitelisted, etc.) — check that first.

You can also open the **Generate** page in the app — once MongoDB is
connected, a "Recent articles" list appears below the generator, backed
by `GET /api/articles`, and it survives redeploys.
