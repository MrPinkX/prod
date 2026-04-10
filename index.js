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
  console.log(added_product);

})

app.listen(port, () => {
  console.log("Server started on port 8080");
})
