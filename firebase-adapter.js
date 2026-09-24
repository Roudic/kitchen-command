// Kitchen Command — Firebase adapter
// Gives the app the same small database API it used on claude.ai
// (db.doc / db.collection / where / onSnapshot / set / update / delete),
// backed by Cloud Firestore, behind an email + password sign-in.
//
// If firebase-config.js still has the PASTE_ placeholders, the app stops
// and waits. Board, team, tasks, and sales are never saved on this device.

import { firebaseConfig, STORE_NAME, FIRESTORE_DATABASE_ID } from "./firebase-config.js";

const V = "10.12.2";
const configured = !String(firebaseConfig.apiKey || "").startsWith("PASTE");

// ---------- sign-in overlay ----------
const css = `
#kc-login{position:fixed;inset:0;z-index:1000;background:#0B0C0E;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#F2F3F4}
#kc-login .box{width:100%;max-width:400px;background:#141619;border:1px solid #2A2E33;border-radius:20px;padding:26px}
#kc-login .mark{width:46px;height:46px;border-radius:12px;background:#E51636;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;margin-bottom:14px}
#kc-login h1{font-size:26px;margin:0 0 4px}
#kc-login p{color:#9AA0A8;margin:0 0 18px;font-size:15px}
#kc-login input{width:100%;box-sizing:border-box;background:#1B1E22;border:2px solid #2A2E33;color:#F2F3F4;border-radius:12px;padding:14px;font-size:18px;margin-bottom:10px}
#kc-login button{width:100%;border:none;border-radius:12px;background:#E51636;color:#fff;font-size:19px;font-weight:800;min-height:58px;cursor:pointer;margin-top:4px}
#kc-login button:disabled{opacity:.6}
#kc-login .err{color:#ff8ea3;font-size:15px;min-height:20px;margin-top:10px}
.kc-signout{display:block;margin:0 auto 20px;background:none;border:none;color:#5E656E;font-size:12px;cursor:pointer;text-decoration:underline}
body.tv .kc-signout{display:none}`;

function injectCss() {
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
}

function showLogin(onSubmit) {
  let el = document.getElementById("kc-login");
  if (!el) {
    el = document.createElement("div");
    el.id = "kc-login";
    el.innerHTML = `<form class="box" autocomplete="on">
      <div class="mark">CFA</div>
      <h1>Kitchen Command</h1>
      <p>${STORE_NAME} · sign in to continue</p>
      <input type="email" name="email" placeholder="Email" autocomplete="username" required>
      <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
      <div class="err"></div>
    </form>`;
    document.body.appendChild(el);
    const form = el.querySelector("form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button"), err = form.querySelector(".err");
      btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
      try {
        await onSubmit(form.email.value.trim(), form.password.value);
      } catch (x) {
        err.textContent = friendlyAuthError(x && x.code);
        btn.disabled = false; btn.textContent = "Sign in";
      }
    });
  }
  el.style.display = "flex";
}
function hideLogin() { const el = document.getElementById("kc-login"); if (el) el.style.display = "none"; }
function showBlocked(title, body) {
  let el = document.getElementById("kc-login");
  if (!el) {
    el = document.createElement("div");
    el.id = "kc-login";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="box">
      <div class="mark">CFA</div>
      <h1>${title}</h1>
      <p>${body}</p>
    </div>`;
  el.style.display = "flex";
}
function friendlyAuthError(code) {
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Wrong email or password.";
  if (code === "auth/too-many-requests") return "Too many tries. Wait a few minutes.";
  if (code === "auth/network-request-failed") return "No internet. Check the Wi-Fi.";
  return "Couldn't sign in (" + (code || "error") + ").";
}

// ---------- Firestore → app database shim ----------
function makeDb(fs, F) {
  const mapCode = (c) => c === "permission-denied" ? "invalid_argument"
    : c === "resource-exhausted" ? "resource_exhausted"
    : c === "invalid-argument" ? "invalid_argument" : "unavailable";
  const toErr = (e) => ({ code: mapCode(e && e.code), message: (e && e.message) || String(e) });
  const guard = (p) => p.catch((e) => { throw toErr(e); });

  const wrapDoc = (s) => ({
    id: s.id,
    exists: s.exists(),
    data: () => s.data(),
    metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites },
  });
  const wrapQuery = (qs) => {
    const docs = qs.docs.map(wrapDoc);
    return {
      docs, size: qs.size, empty: qs.empty,
      docChanges: () => qs.docChanges().map((c) => ({ type: c.type, doc: wrapDoc(c.doc), oldIndex: c.oldIndex, newIndex: c.newIndex })),
      metadata: { fromCache: qs.metadata.fromCache, hasPendingWrites: qs.metadata.hasPendingWrites },
    };
  };

  function docRef(path) {
    const r = F.doc(fs, path);
    return {
      id: r.id, path,
      get: () => guard(F.getDoc(r).then(wrapDoc)),
      set: (d) => guard(F.setDoc(r, d)),
      update: (d) => guard(F.updateDoc(r, d)),
      delete: () => guard(F.deleteDoc(r)),
      onSnapshot: (next, error) => F.onSnapshot(r, (s) => next(wrapDoc(s)), (e) => error && error(toErr(e))),
      collection: (sub) => colRef(path + "/" + sub),
    };
  }
  function queryRef(path, cons) {
    const base = F.collection(fs, path);
    const q = cons.length ? F.query(base, ...cons) : base;
    return {
      where: (f, op, v) => queryRef(path, cons.concat(F.where(f, op, v))),
      orderBy: (f, dir) => queryRef(path, cons.concat(F.orderBy(f, dir || "asc"))),
      limit: (n) => queryRef(path, cons.concat(F.limit(n))),
      get: () => guard(F.getDocs(q).then(wrapQuery)),
      onSnapshot: (next, error) => F.onSnapshot(q, (s) => next(wrapQuery(s)), (e) => error && error(toErr(e))),
    };
  }
  function colRef(path) {
    const c = queryRef(path, []);
    c.path = path;
    c.doc = (id) => docRef(id ? path + "/" + id : F.doc(F.collection(fs, path)).path);
    c.add = (d) => { const r = c.doc(); return r.set(d).then(() => r); };
    return c;
  }
  return { doc: docRef, collection: colRef };
}

// ---------- boot ----------
async function boot() {
  injectCss();
  if (!configured) {
    showBlocked(
      "Database required",
      STORE_NAME + " saves the board, team, tasks, and sales in Cloud Firestore. This copy is not connected yet. Fill in firebase-config.js, then reload. Nothing is saved on this device."
    );
    return;
  }
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  await A.setPersistence(auth, A.browserLocalPersistence); // stay signed in on the store iPad
  let fs;
  try {
    // Offline cache: the board keeps working through Wi-Fi drops and syncs when it's back.
    // Live listeners and the offline cache are required so every screen stays in sync
    // through Wi-Fi drops. That is why this uses onSnapshot instead of pipelines.
    fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }, FIRESTORE_DATABASE_ID);
  } catch (e) {
    fs = F.getFirestore(app, FIRESTORE_DATABASE_ID);
  }

  let resolved = false;
  A.onAuthStateChanged(auth, (user) => {
    if (user) {
      hideLogin();
      if (!resolved) {
        resolved = true;
        window.__kc.resolveDb(makeDb(fs, F));
        addSignOut(() => A.signOut(auth));
      }
    } else if (resolved) {
      location.reload(); // signed out elsewhere → back to the sign-in screen
    } else {
      showLogin((email, pw) => A.signInWithEmailAndPassword(auth, email, pw));
    }
  });
}

function addSignOut(fn) {
  if (document.querySelector(".kc-signout")) return;
  const b = document.createElement("button");
  b.className = "kc-signout";
  b.textContent = "Sign out";
  b.addEventListener("click", () => { if (confirmSignOut()) fn(); });
  (document.getElementById("app") || document.body).appendChild(b);
}
function confirmSignOut() {
  const b = document.querySelector(".kc-signout");
  if (b.dataset.armed) return true;
  b.dataset.armed = "1"; b.textContent = "Tap again to sign out";
  setTimeout(() => { delete b.dataset.armed; b.textContent = "Sign out"; }, 3000);
  return false;
}

boot().catch((e) => {
  console.error("[Kitchen Command] Firebase failed to start:", e);
  showBlocked(
    "Database unavailable",
    "Cloud Firestore did not start (" + ((e && (e.code || e.message)) || "error") + "). Check the internet connection and firebase-config.js, then reload. Nothing is saved on this device."
  );
});
