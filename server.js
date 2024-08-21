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


  app.use(checkLogin); // Apply globally, will check for any routes below this line
  app.use('/student', checkRole('student')); // Apply only to routes under /student

 // Route to render course selection page
 app.get('/select-courses', checkLogin, (req, res) => {
  const query = 'SELECT * FROM tb_matkul';
  db.query(query, (err, courses) => {
    if (err) throw err;
    res.render('select-courses', { courses });
  });
});

// Route to handle course selection form submission
app.post('/save-courses', checkLogin, (req, res) => {
  const { course1, course2, course3 } = req.body;
  const studentId = req.session.userId;
  
  // Insert courses into detail_matkul
  const query = `
    INSERT INTO tb_detailmatkul (mahasiswa_id, matkul_id)
    VALUES (?, ?), (?, ?), (?, ?)`;
  db.query(query, [studentId, course1, studentId, course2, studentId, course3], (err) => {
    if (err) throw err;
    res.redirect('/students');
  });
});
  //   res.render('course', res.render("admin", { mahasiswa: mahasiswa, dosen: dosen, title: "SELAMAT DATANG PADA MENU ADMINISTRASI" })
  //     materials,
  //     studentName: req.session.name // Pass the student's name to the template
  //   });
  // });







  // // Route for students
  // app.get("/student", checkLogin, checkRole('student'), (req, res) => {
  //   res.render("students", { name: req.session.name, title: "Student Page" });
  // });

  // // Route for faculty
  // app.get("/dosen", checkLogin, checkRole('faculty'), (req, res) => {
  //   res.render("dosen", { name: req.session.name, title: "Faculty Page" });
  // });

  app.get("/admin", checkLogin, (req, res) => {
    const sqlMahasiswa = "SELECT * FROM tb_mahasiswa WHERE hapus IS NULL";
    const sqlDosen = "SELECT * FROM tb_dosen WHERE hapus IS NULL";
  
    db.query(sqlMahasiswa, (err, mahasiswaResult) => {
      if (err) {
        console.log("Gagal menampilkan data mahasiswa");
      }
      const mahasiswa = JSON.parse(JSON.stringify(mahasiswaResult));
  
      db.query(sqlDosen, (err, dosenResult) => {
        if (err) {
          console.log("Gagal menampilkan data dosen");
        }
        const dosen = JSON.parse(JSON.stringify(dosenResult));
  
        res.render("admin", { mahasiswa: mahasiswa, dosen: dosen, title: "SELAMAT DATANG PADA MENU ADMINISTRASI" });
      });
    });
  });

  app.get("/admin/tambahDosen", checkLogin, checkRole('admin'), (req, res) => {
    const sqlDosen = "SELECT * FROM tb_dosen WHERE hapus IS NULL";
    
    db.query(sqlDosen, (err, dosenResult) => {
      if (err) {
        console.log("Gagal menampilkan data dosen");
        res.status(500).send("Error retrieving data");
      } else {
        const dosen = JSON.parse(JSON.stringify(dosenResult));
        res.render("tambahDosen", { dosen: dosen, title: "SELAMAT DATANG PADA MENU ADMINISTRASI" });
      }
    });
  });

  app.get("/admin/tambahMahasiswa", checkLogin, checkRole('admin'), (req, res) => {
    const sqlMahasiswa = "SELECT * FROM tb_mahasiswa WHERE hapus IS NULL";
    
    db.query(sqlMahasiswa, (err, mahasiswaResult) => {
      if (err) {
        console.log("Gagal menampilkan data mahasiswa");
        res.status(500).send("Error retrieving data");
      } else {
        const mahasiswa = JSON.parse(JSON.stringify(mahasiswaResult));
        res.render("tambahMahasiswa", { mahasiswa: mahasiswa, title: "SELAMAT DATANG PADA MENU ADMINISTRASI" });
      }
    });
  });
  

  
  


  app.post("/tambahmahasiswa", checkLogin, checkRole('admin'), (req, res) => {
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
        res.redirect("/admin/tambahMahasiswa");
      }
    });
  });
  app.post("/tambahdosen", checkLogin, checkRole('admin'), (req, res) => {
    const { nip, namadosen, password} = req.body;
    
    const insertDosen = `INSERT INTO tb_dosen (nip, namadosen, password) VALUES (?,?,?)`;
    const value = [nip, namadosen, password];
    db.query(insertDosen, value, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({
          "success": false,
          "message": err.sqlMessage,
          "data": null,
        });
      } else {
        res.redirect("/admin/tambahDosen");
      }
    });
  });
  
  app.post("/updatemahasiswa", checkLogin, checkRole('admin'), (req, res) => {
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
        res.redirect("/admin/tambahMahasiswa");
      }
    });
  });

  app.post("/deletemahasiswa", checkLogin, checkRole('admin'), (req, res) => {
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
        res.redirect("/admin/tambahMahasiswa");
      }
    });
  });
});

app.listen(8082, () => {
  console.log("SERVER READY...");
});
