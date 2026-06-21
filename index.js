const dns = require("node:dns")
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const cors = require("cors");
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("resell_hub_db");

     const usersCollection = database.collection("user");
const productsCollection = database.collection("products");
const ordersCollection = database.collection("orders");
const reviewsCollection = database.collection("reviews");
const paymentsCollection = database.collection("payments");

app.get("/statistics", async (req, res) => {
  const totalUsers = await usersCollection.countDocuments();

  const totalProducts =
    await productsCollection.countDocuments();

  const totalOrders =
    await ordersCollection.countDocuments();

  const completedOrders =
    await ordersCollection.countDocuments({
      orderStatus: "delivered",
    });

  res.send({
    totalUsers,
    totalProducts,
    totalOrders,
    completedOrders,
  });
});

// Add Product API

app.post("/products", async (req, res) => {
  try {
    const product = req.body;

    const result = await productsCollection.insertOne(product);

    res.send({
      success: true,
      insertedId: result.insertedId,
      message: "Product added successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//get products
app.get("/products", async (req, res) => {
  const result = await productsCollection.find().toArray();
  res.send(result);
});

//Read products

const { ObjectId } = require("mongodb");

app.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const result = await productsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updatedData,
    }
  );

  res.send(result);
});

//delete products

app.delete("/products/:id", async (req, res) => {
  const id = req.params.id;

  const result = await productsCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

//search products

app.get("/products", async (req, res) => {
  const search = req.query.search || "";

  const query = {
    title: {
      $regex: search,
      $options: "i",
    },
  };

  const result = await productsCollection
    .find(query)
    .toArray();

  res.send(result);
});

const query = {};

if (req.query.category) {
  query.category = req.query.category;
}

if (req.query.condition) {
  query.condition = req.query.condition;
}


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
   finally {
    // Ensures that the client will close when you finish/error
    
  }

  
 
}


run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})