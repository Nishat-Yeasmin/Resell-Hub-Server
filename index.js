const dns = require("node:dns")
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const cors = require("cors");
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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

const jwt = require("jsonwebtoken");

app.post("/jwt", async (req, res) => {
  const { email, role, _id } = req.body;

  if (!email) {
    return res.status(400).send({ message: "Email required" });
  }

  const token = jwt.sign(
    {
      email,
      role,
      userId: _id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.send({ token });
});

function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "Unauthorized Access",
    });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, decoded) => {
      if (err) {
        return res.status(401).send({
          message: "Invalid Token",
        });
      }

      req.decoded = decoded;
      next();
    }
  );
}



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
  const search = req.query.search || "";
  const category = req.query.category;
  const condition = req.query.condition;

  let query = {
    title: { $regex: search, $options: "i" },
  };

  if (category) {
    query.category = category;
  }

  if (condition) {
    query.condition = condition;
  }

  const result = await productsCollection.find(query).toArray();
  res.send(result);
});

// single product

app.get("/products/:id", async (req, res) => {
  const id = req.params.id;

  const result = await productsCollection.findOne({
    _id: new ObjectId(id),
  });

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

//update products
app.patch("/products/:id", async (req, res) => {
  const id = req.params.id;

  const updateDoc = { $set: req.body };

  const result = await productsCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc
  );

  res.send(result);
});

// GET: Buyer Orders
app.get("/orders", verifyToken, async (req, res) => {
  try {
    const buyerId = req.decoded.userId;

    const orders = await ordersCollection
      .find({ "buyerInfo.userId": buyerId })
      .sort({ _id: -1 })
      .toArray();

    res.send(orders);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

//post orders
app.post("/orders", verifyToken, async (req, res) => {
  const order = req.body;

  order.buyerInfo.userId = req.decoded.userId; //  real user
  order.orderStatus = "pending";
  order.paymentStatus = "unpaid";
  order.createdAt = new Date();

  const result = await ordersCollection.insertOne(order);

  res.send(result);
});

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