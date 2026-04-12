const express = require('express');
const app = express();
path = require("path");
var bodyParser = require('body-parser');
const port = process.env.PORT || 8080; 
const bcrypt = require('bcrypt');
var cookieParser = require("cookie-parser");
app.use(cookieParser())
var jwt = require('jsonwebtoken');


app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');


app.use( express.static( "public" ) );


// import sqlite3 from "sqlite3";

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { features } = require('process');

var jsonParser = bodyParser.json()

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, "aa.html"));
})



app.post(`/search`, jsonParser, async (req, res) => {
  val = req.body["val"]

   const db2 = await open({
    filename: 'd.db',
    driver: sqlite3.Database
  }) 


  results = await db2.all(`SELECT *
FROM products_ as t
LEFT OUTER JOIN products as d
on t.product = d.barcode WHERE product_name_ LIKE "%${val}%"`)

  console.log(results);

  res.send(results);

    
})


app.post(`/add_venue`, jsonParser, async (req, res) => {
  val = req.body[1];
  val_ = req.body[0];



  const db2 = await open({
  filename: 'd.db',
  driver: sqlite3.Database
  }) 

  console.log(`UPDATE products 
  SET venues = '${JSON.stringify([val_])}'
  WHERE barcode LIKE "${val}"`);


  

  results = await db2.all(`SELECT * FROM products WHERE barcode LIKE "%${val}%"`);


  
  venues = JSON.parse(results[0]["venues"]);

  console.log(venues, val_)
  if (venues) {
      venues.push(val_)
  } else {
    venues = [val_]
  }
  
  db2.exec(`UPDATE products 
    SET venues = '${JSON.stringify(venues)}'
    WHERE barcode = ${val}`);

  res.send(val);

    
})




app.post("/add_to_user_list", jsonParser, async (req, res) => {
  added_product = req.body["added_product_"];
 try { 
    user = jwt.verify(req.cookies.toky, "shhhhh"); 
  } catch {
    user = false;
  }

  const db2 = await open({
        filename: 'd.db',
        driver: sqlite3.Database
      }) 

  db2.exec(`CREATE TABLE IF NOT EXISTS users_list (
    username VARCHAR,
    list VARCHAR
  );`)

  results = await db2.all(`SELECT * FROM users_list WHERE username = "${user["username"]}"`);

  list = []

  if (results.length>0) {
    list = JSON.parse(results[0]['list']);
    list.push(added_product)
    console.log(list, "17")
  }
  else {
    list = [added_product]
  }
  list = JSON.stringify(list)

  console.log(list);


  if (results.length>0) {
    db2.exec(`UPDATE users_list
            SET list = '${list}'
            WHERE username = "${user["username"]}"`)
  } else {
    console.log(`INSERT INTO users_list
            VALUES ("${user}", '${list}'); `)
     db2.exec(`INSERT INTO users_list
            VALUES ("${user["username"]}", '${list}'); `);
  }
  
  console.log(added_product, user);

})






app.post(`/send_userlist`, jsonParser, async (req, res) => {
let user;
  try { 
    user = jwt.verify(req.cookies.toky, "shhhhh"); 
  } catch {
    user = false;
  }

const db2 = await open({
        filename: 'd.db',
        driver: sqlite3.Database
      }) 


results = await db2.all(`SELECT * FROM users_list WHERE username = "${user["username"]}"`);
console.log(`SELECT * FROM users_list WHERE username = "${user["username"]}"`);
console.log(results, "user_list");
product_items_ = [];

list = [];
if (results.length>0) {
  list_ = JSON.parse(results[0]["list"]);
  product_items = ``
  for (i=0; i<list_.length; i++) {
    product_items += `${list_[i]}, `
  }

  qu = `SELECT * FROM products_ WHERE product in (${product_items.slice(0, product_items.length-2)})`;
  console.log(qu)

  product_items_ = await db2.all(qu);

}


if (user) {
  res.send(["User!", product_items_])
} 

console.log(req.body, "ASDASDASD")
if (req.body[1]) {
  user_list = req.body[1]
   

  name_list = []
  for (i=0; i<user_list.length; i++) {
    name_list.push(user_list[i]["product"]);
  }

  console.log(name_list, "names");


  name_list = JSON.stringify(name_list);


    db2.exec(`UPDATE users_list
            SET list = '${name_list}'
            WHERE username = "${user["username"]}"`)
  }


})







app.use(express.urlencoded({ extended: false }));
users_ = []
app.post(`/signup`, jsonParser, async (req, res) => {


  const db2 = await open({
        filename: 'd.db',
        driver: sqlite3.Database
      }) 

   db2.exec(`CREATE TABLE IF NOT EXISTS users (
    username VARCHAR,
    passwordx VARCHAR
  );`)
  // try {
    
    const username = req.body["usernamex"];
    const password = req.body["password"];
    console.log("password", password)
    
    
    console.log((await db2.all(`SELECT * FROM users WHERE username LIKE "${username}"`)))
    if ((await db2.all(`SELECT * FROM users WHERE username LIKE "${username}"`)).length < 1) {
      console.log(req.body)

      if (password.length < 8) {
        res.send(["Password too short"]);
      } else {
        if (req.body.enter) {
          const salt = await bcrypt.genSalt();
          const hashed = await bcrypt.hash(req.body["password"], salt);
          db2.exec(`INSERT INTO users
            VALUES ("${username}", "${hashed}"); `);
          console.log("user created");
          // res.redirect("/profile");
          // res.send(["User created"]);
        } else {
          res.send(["Password good"]);
        }
      }
    } else {
      console.log("User already exist");
      res.send(["User already exist"]);
    }
   
}) 




app.get(`/profile`, async (request, response) => {
  console.log("PROFILE");
  try {
    user = jwt.verify(request.cookies.toky, "shhhhh"); 
    console.log(user, "USHER");

    const db2 = await open({
      filename: 'farter_2.db',
      driver: sqlite3.Database
    }) 

    userdata = await db2.all(`SELECT * FROM users_data WHERE username LIKE "${user['username']}"`);
    console.log(userdata);
    l = ''
    for (let i = 0; i < userdata.length; i++) {
        l = l + `"${userdata[i]['fav_movies']}"` + ", "
    }

    query = `SELECT * FROM movies
    WHERE level_0 IN (${l.slice(0, l.length - 2)}) limit 20;`


    usersmovies = await db2.all(query);
    sob = JSON.stringify(usersmovies)

    response.render("profile", {datat: usersmovies, username: user['username']});



  } catch(err) {
    console.log(err, "SHHSHSH")
  }
  
  

})







app.post("/login", jsonParser, async (req, res) => {
  const db2 = await open({
    filename: 'd.db',
    driver: sqlite3.Database
  })

  console.log(req.body["usernamex"], req.body["password"], "11111n");


  user11 = await db2.all(`SELECT * FROM users WHERE username LIKE "${req.body['usernamex']}";`);
  console.log(user11, "xz");
  
  if (user11.length>0) {
     if (await bcrypt.compare(req.body["password"], user11[0]["passwordx"])) {
      // token = "123123asdasd123asdZAZXCZXXX";
      console.log("password correct");
      var token = jwt.sign(user11[0], 'shhhhh');
      console.log("Logged in");
      res.cookie("toky", token, {httpOnly: true});
      // res.redirect("/profile");
      res.send(["success"]);
    } else {
      console.log("wrong password")
      res.send(['wrong password']);
    }
  } else {
    console.log("no such user");
    res.send(["no such user"])
  }
  // try {
   
}) 

app.post("/logout", jsonParser, async (req, res) => {
  console.log(res.cookie, 'logout');
  res.clearCookie("toky");
  res.send(['logged out']);
  res.end();

})




app.listen(port, () => {
  console.log("Server started on port 8080");
})
