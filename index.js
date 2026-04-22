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
app.use( express.static( "./static" ) );



// import sqlite3 from "sqlite3";

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { features } = require('process');

var jsonParser = bodyParser.json()

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, "aa.html"));
})



app.post(`/search`, jsonParser, async (req, res) => {
  console.log("something")
  val = req.body["val"]
  console.log(val, "aala");

   const db2 = await open({
    filename: 'd.db',
    driver: sqlite3.Database
  }) 


  results = await db2.all(`SELECT *
    FROM products_ as t
    LEFT OUTER JOIN products as d
    on t.product = d.barcode WHERE product_name_ LIKE "%${val}%" OR product LIKE "%${val}%"`)

  console.log(`SELECT *
    FROM products_ as t
    LEFT OUTER JOIN products as d
    on t.product = d.barcode WHERE product_name_ LIKE "%${val}%" OR product LIKE "%${val}%"`)

  

  clusters = await db2.all(`SELECT COUNT(*), product_cluster FROM products_ WHERE product_cluster LIKE "%${val}%"`);
  cluster_names = []
  for (let i=0; i<clusters.length; i++) {
    list = JSON.parse(clusters[i]["product_cluster"]);
    if (list) {
      for (let x=0; x<list.length; x++) {
      console.log(x)
      if (cluster_names.includes(list[x]) == false) {
        cluster_names.push(list[x])
      }
    }
    }
    
  }

  console.log(cluster_names, "clustr nms");

  clusters = {}
  for (let i=0; i<cluster_names.length; i++) {
    cluster = await db2.all(`SELECT COUNT(*), product_cluster FROM products_ WHERE product_cluster LIKE "%${cluster_names[i]}%"`);
    clusters[cluster_names[i]] = cluster[0]["COUNT(*)"]
  }





  results = [results, clusters];
  res.send(results);

    
})



app.post(`/load_cluster_pro`, jsonParser, async (req, res) => {

  cluster_name = req.body["cluster_name"];
  console.log(cluster_name, "clu");

     const db2 = await open({
      filename: 'd.db',
      driver: sqlite3.Database
    }) 

    
    products = await db2.all(`SELECT * FROM products_ WHERE product_cluster LIKE "%${cluster_name}%"`);

    res.send([products]);

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





async function rank_venues(product_list) {

  
const db2 = await open({
        filename: 'd.db',
        driver: sqlite3.Database
      }) 


  venues_rank = {} 

  for (let i=0; i<product_list.length; i++) {
    venues = JSON.parse(product_list[i]["venues"])['venues']
    for (let x=0; x<venues.length; x++) {
      if (Object.keys(venues_rank).includes(venues[x]["venue_name"])) {
        venues_rank[venues[x]["venue_name"]]["total"] += parseFloat(venues[x]["price"]);
        venues_rank[venues[x]["venue_name"]]["prods"].push(product_list[i]["product"]);
      } else {
        venues_rank[venues[x]["venue_name"]] = {"total": parseFloat(venues[x]["price"]), "prods": [product_list[i]["product"]], "alters":[]};
      }
    }
  }

  for (let i=0; i<Object.keys(venues_rank).length; i++) {
    venue_name = Object.keys(venues_rank)[i]
    venue_products = venues_rank[venue_name]["prods"]
    miss = []
    for (let x=0; x<product_list.length; x++) {
      if (venue_products.includes(product_list[x]["product"])==false) {
        miss.push(product_list[x])
      }
    }


    venues_rank[venue_name]["missing"] = miss;


    for (let x=0; x<miss.length; x++) {
      alters = JSON.parse(miss[x]['product_alternates'])
      

      for (let n=0; n<alters.length; n++) {
        alter_info = await db2.all(`SELECT * FROM products_ WHERE product = "${alters[n]}"`);
        alter_venues = JSON.parse(alter_info[0]["venues"])["venues"];
        for (v=0; v<alter_venues.length; v++) {
          if (alter_venues["venue_name"] == venue_name) {
            venues_rank[venue_name]["total"] += (alter_venues["price"])
            venues_rank[venue_name]["alters"].push(alters[n])
          }
        }
      }
    }
  }

  return venues_rank;
}



// Send user his shopping list
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
product_items_ = [];

list = [];
if (results.length>0) {
  list_ = JSON.parse(results[0]["list"]);
  product_items = ``
  for (i=0; i<list_.length; i++) {
    product_items += `${list_[i]}, `
  }

  qu = `SELECT * FROM products_ WHERE product in (${product_items.slice(0, product_items.length-2)})`;

  product_items_ = await db2.all(qu);

}



venues_rank = await rank_venues(product_items_);

if (user) {
  res.send(["User!", product_items_, venues_rank])
} 



})



app.post('/update_userlist' ,jsonParser, async (req, res) => {

  const db2 = await open({
          filename: 'd.db',
          driver: sqlite3.Database
        }) 
        


  let user;
    try { 
      user = jwt.verify(req.cookies.toky, "shhhhh"); 
    } catch {
      user = false;
    }


    user_list = req.body[1]
    
    name_list = []
    for (i=0; i<user_list.length; i++) {
      name_list.push(user_list[i]["product"]);
    }



    name_list = JSON.stringify(name_list);


    db2.exec(`UPDATE users_list
              SET list = '${name_list}'
              WHERE username = "${user["username"]}"`)


    qu = `SELECT * FROM products_ WHERE product in (${name_list.replace("[", "").replace("]", "")})`;
    console.log(qu)

    product_items_ = await db2.all(qu);

    venues_rank = await rank_venues(product_items_);

    console.log(req.body, "aaaa");
    res.send(["User!!", product_items_, venues_rank])
})





app.post('/add_recipe' ,jsonParser, async (req, res) => {
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


  
  recipe_info = req.body["recipe_"]
  console.log(recipe_info);



  ingrediants = recipe_info["ingrediants"];

  ingrediants_ = ""
  for (i=0; i<ingrediants.length; i++) {
    console.log(ingrediants[i])
    ingrediants_ += `${ingrediants[i][0]}, `
  }


  // Calc 
  console.log(`SELECT * FROM products_ WHERE product in (${ingrediants_.slice(0, ingrediants_.length-2)})`);
  ingrediants_objects = await db2.all(`SELECT * FROM products_ WHERE product in (${ingrediants_.slice(0, ingrediants_.length-2)})`);
  console.log(ingrediants_objects);
  recipe_price = 0
  for (i=0; i<ingrediants_objects.length; i++) {
    console.log("loop");
    
    venues = JSON.parse(ingrediants_objects[i]['venues'])['venues'];
    console.log(venues[0], "venue");
    recipe_price += parseInt(venues[0]["price"])

  }

  console.log(recipe_price)

  console.log(`INSERT INTO recipes
            VALUES ("${user}", "${recipe_info['title']}", '${recipe_info['description']}', "${JSON.stringify(ingrediants)}", ${recipe_price}, ${null}) `)

  

  db2.exec(`INSERT INTO recipes
            VALUES ("${user}", "${recipe_info['title']}", '${recipe_info['description']}', '${JSON.stringify(ingrediants)}', ${recipe_price}, ${null}) `);
  
  res.send(["success"])

})

//// Functions 
// Determine cheapest supermrket 
async function cheapest_market(product_list) {

  // Loop through product_list, get the shopping list total in each venue 
  // And the amount of available products in each venue
  for (let i = 0; i<product_list.length; i++) {
    venue_list = JSON.parse(product_list[i]["venues"])["venues"]
    for (let x=0; x<venue_list.length; x++) {
      if (Object.keys(venues).includes(venue_list[x]["venue_name"])) {
        venues[venue_list[x]["venue_name"]][0] += parseInt(venue_list[x]['price'])
        venues[venue_list[x]["venue_name"]][1].push(product_list[i]["product_name_"])
      } else {
        venues[venue_list[x]["venue_name"]] = [parseInt(venue_list[x]['price']), [i]]
      }
    }
  }

  return venues; 
}








app.post('/send_recipes' ,jsonParser, async (req, res) => {

   const db2 = await open({
        filename: 'd.db',
        driver: sqlite3.Database
      }) 

  db2.exec(`CREATE TABLE IF NOT EXISTS recipes (
    username VARCHAR,
    name VARCHAR,
    description VARCHAR,
    products VARCHAR,
    price FLOAT
    image VARCHAR
  );`)

  recipes = await db2.all(`SELECT * FROM recipes`);

  console.log(recipes);
  
  res.send([recipes])

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
