const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
  })
);

const db = mysql.createConnection({
  host: "localhost",
  port: "3307",
  database: "db_polmed",
  user: "root",
  password: "",
});

db.connect((err) => {
  if (err) throw err;

  function checkLogin(req, res, next) {
    if (req.session.loggedIn) {
      next();
    } else {
      res.redirect("/login");
    }
  }

  function checkRole(role) {
    return function(req, res, next) {
      if (req.session.role === role) {
        next();
      } else {
        res.status(403).send("Access denied.");
      }
    };
  }

  app.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
  });

  app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const studentQuery = "SELECT * FROM tb_mahasiswa WHERE nim = ? AND password = ?";
    db.query(studentQuery, [username, password], (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error during login");
      } else if (result.length > 0) {
        req.session.loggedIn = true;
        req.session.userId = result[0].id;
        req.session.role = 'student';
        req.session.name = result[0].nama; // Store the student's name
        res.redirect("/student");
      } else {
        const facultyQuery = "SELECT * FROM tb_dosen WHERE nip = ? AND password = ?";
        db.query(facultyQuery, [username, password], (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).send("Error during login");
          } else if (result.length > 0) {
            req.session.loggedIn = true;
            req.session.userId = result[0].id;
            req.session.role = 'faculty';
            req.session.name = result[0].nama; // Store the faculty's name
            res.redirect("/dosen");
          } else {
            const adminQuery = "SELECT * FROM tb_admin WHERE kodeadmin = ? AND password = ?";
            db.query(adminQuery, [username, password], (err, result) => {
              if (err) {
                console.log(err);
                res.status(500).send("Error during login");
              } else if (result.length > 0) {
                req.session.loggedIn = true;
                req.session.userId = result[0].id;
                req.session.role = 'admin';
                req.session.name = result[0].nama; // Store the admin's name
                res.redirect("/admin");
              } else {
                res.send("Invalid username or password");
              }
            });
          }
        });
      }
    });
  });

  app.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });

  // Route for students
  app.get("/student", checkLogin, checkRole('student'), (req, res) => {
    res.render("students", { name: req.session.name, title: "Student Page" });
  });

  // Route for faculty
  app.get("/dosen", checkLogin, checkRole('faculty'), (req, res) => {
    res.render("dosen", { name: req.session.name, title: "Faculty Page" });
  });

  app.get("/admin", checkLogin, (req, res) => {
    const sql = "SELECT * FROM tb_mahasiswa WHERE hapus IS NULL";
    db.query(sql, (err, result) => {
      if (err) {
        console.log("Gagal menampilkan data");
      }
      const users = JSON.parse(JSON.stringify(result));
      res.render("admin", { datas: users, title: "SELAMAT DATANG PADA MENU ADMINISTRASI" });
    });
  });
  


  app.post("/tambah", checkLogin, checkRole('admin'), (req, res) => {
    const { nim, nama, password, kelas} = req.body;
    
    const insertSql = `INSERT INTO tb_mahasiswa (nim, namamahasiswa, password, kelas) VALUES (?,?,?,?)`;
    const value = [nim, nama, password, kelas];
    db.query(insertSql, value, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({
          "success": false,
          "message": err.sqlMessage,
          "data": null,
        });
      } else {
        res.redirect("/admin");
      }
    });
  });
  
  app.post("/update", checkLogin, checkRole('admin'), (req, res) => {
    const { id, nim, nama, password, kelas} = req.body;
    
    const updateSql = `UPDATE tb_mahasiswa SET nim = ?, namamahasiswa = ?, password = ?, kelas = ? WHERE id = ? AND hapus IS NULL`;
    const value = [nim, nama, password, kelas, id];
    db.query(updateSql, value, (err, result) => {
      if (err) {
        console.log("Gagal mengupdate data");
        res.status(500).json({
          "success": false,
          "message": err.sqlMessage,
          "data": null,
        });
      } else {
        res.redirect("/admin");
      }
    });
  });

  app.post("/delete", checkLogin, checkRole('admin'), (req, res) => {
    const { id } = req.body;

    const updateSql = "UPDATE tb_mahasiswa SET hapus = ? WHERE id = ?";
    const values = ["ya", id];

    db.query(updateSql, values, (err, result) => {
      if (err) {
        console.log("Gagal memperbarui kelas");
        res.status(500).json({
          "success": false,
          "message": err.sqlMessage,
          "data": null,
        });
      } else {
        res.redirect("/admin");
      }
    });
  });
});

app.listen(8082, () => {
  console.log("SERVER READY...");
});
