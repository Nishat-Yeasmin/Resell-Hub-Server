const dns = require("node:dns")
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const cors = require("cors");
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.decoded = {
    userId: "demo-user-1",
  };
  next();
});

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
const wishlistCollection = database.collection("wishlist");



app.get("/statistics", async (req, res) => {
  try {
    const totalProducts = await productsCollection.countDocuments();

    const totalSellers = await usersCollection.countDocuments({
      role: "seller",
    });

    const totalBuyers = await usersCollection.countDocuments({
      role: "buyer",
    });

    const completedOrders = await ordersCollection.countDocuments({
      orderStatus: "delivered",
    });

    res.send({
      totalProducts,
      totalSellers,
      totalBuyers,
      completedOrders,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
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

// Get Popular Categories
app.get("/categories", async (req, res) => {
  try {
    const products = await productsCollection.find().toArray();

    const categoryMap = {};

    products.forEach((product) => {
      const category = product.category;

      if (!categoryMap[category]) {
        categoryMap[category] = {
          name: category,
          image: product.image,
          count: 1,
        };
      } else {
        categoryMap[category].count++;
      }
    });

    res.send(Object.values(categoryMap));
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});


// single product

app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const product =
      await productsCollection.findOne({
        _id: new ObjectId(id),
      });

    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
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
app.get("/orders", async (req, res) => {
  // try {
  //   const buyerId = req.query.userId;

  //   const orders = await ordersCollection
  //     .find({ "buyerInfo.userId": buyerId })
  //     .sort({ _id: -1 })
  //     .toArray();
    const user = req.user;

  if (!user) {
    return res.send([]);
  }

  const orders = await ordersCollection
    .find({
      "buyerInfo.userId": user.id,
    })
    .toArray();

    res.send(orders);
  // }catch (error) {
  //   res.status(500).send({
  //     message: "Failed to fetch orders",
  //     error: error.message,
  //   });
  // }
});

// Single Order Details

app.get("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const order = await ordersCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send(order);
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});

//post orders

app.post("/orders", async (req, res) => {
 const user = req.user;

  if (!user) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }


  const order = req.body;

  const newOrder = {
    productId: order.productId,
    productTitle: order.productTitle,
    productImage: order.productImage,

    quantity: order.quantity,
    totalAmount: order.totalAmount,

     buyerInfo: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
    sellerInfo: order.sellerInfo,

    shippingAddress: order.shippingAddress,

    orderStatus: "pending",
    paymentStatus: "pending",

    createdAt: new Date(),
  };

  const result =
    await ordersCollection.insertOne(newOrder);

  res.send(result);
});

//cancel an orders
app.patch("/orders/:id/cancel", async (req, res) => {
  const id = req.params.id;

  const order =
    await ordersCollection.findOne({
      _id: new ObjectId(id),
    });

  if (
    order.orderStatus === "shipped" ||
    order.orderStatus === "delivered"
  ) {
    return res.status(400).send({
      message:
        "Order cannot be cancelled",
    });
  }

  const result =
    await ordersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          orderStatus: "cancelled",
        },
      }
    );

  res.send(result);
});


//update order status
app.patch("/orders/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const result = await ordersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { orderStatus: status } }
  );

  res.send(result);
});


//post wishlist

app.post("/wishlist", async (req, res) => {
  const item = req.body;

  item.userId = req.body.userId;
  item.createdAt = new Date();

  const result = await wishlistCollection.insertOne(item);

  res.send(result);
});

//get wishlist
app.get("/wishlist", async (req, res) => {
  try {
    const userId = req.query.userId;

    const result = await wishlistCollection.find({ userId }).toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

//delete wishlist
app.delete("/wishlist/:id", async (req, res) => {
  const id = req.params.id;

  const result = await wishlistCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

//post payments
app.post("/payments", async (req, res) => {
  const payment = req.body;

  payment.buyerId = req.decoded.userId;
  payment.paymentStatus = "success";
  payment.paymentDate = new Date();

  const result = await paymentsCollection.insertOne(payment);

  res.send(result);
});

//get payments:

app.get("/payments", async (req, res) => {
  const userId = req.decoded.userId;

  const result = await paymentsCollection.find({ buyerId: userId }).toArray();

  res.send(result);
});

//seller products

app.get("/seller/products", async (req, res) => {
  const sellerId = req.decoded.userId;

  const { search = "", category, condition } = req.query;

  let query = {
    "sellerInfo.userId": sellerId,
    title: { $regex: search, $options: "i" },
  };

  if (category) query.category = category;
  if (condition) query.condition = condition;

  const result = await productsCollection.find(query).toArray();
  res.send(result);
});

//seller stats

app.get("/seller/stats", async (req, res) => {
  const sellerId = req.decoded.userId;

  const totalProducts = await productsCollection.countDocuments({
    "sellerInfo.userId": sellerId,
  });

  const totalOrders = await ordersCollection.countDocuments({
    "sellerInfo.userId": sellerId,
  });

  const deliveredOrders = await ordersCollection.countDocuments({
    "sellerInfo.userId": sellerId,
    orderStatus: "delivered",
  });

  res.send({
    totalProducts,
    totalOrders,
    deliveredOrders,
  });
});

//seller order management

app.get("/seller/orders", async (req, res) => {
  const sellerId = req.decoded.userId;

  const orders = await ordersCollection
    .find({ "sellerInfo.userId": sellerId })
    .toArray();

  res.send(orders);
});

//get admin dashboard
app.get("/admin/dashboard", async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();

    const totalProducts = await productsCollection.countDocuments();

    const totalOrders = await ordersCollection.countDocuments();

    res.send({
      totalUsers,
      totalProducts,
      totalOrders,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});

//get all users

app.get("/admin/users", async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});

//block user

// app.patch("/admin/users/:id/block", async (req, res) => {
//   const id = req.params.id;

//   const result = await usersCollection.updateOne(
//     { _id: new ObjectId(id) },
//     { $set: { status: "blocked" } }
//   );

//   res.send(result);
// });

app.patch("/admin/users/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const result = await usersCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: {
        status,
      },
    }
  );

  res.send(result);
});

//delete users
app.delete("/admin/users/:id", async (req, res) => {
  const id = req.params.id;

  const result = await usersCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


//admin product
app.get("/admin/products", async (req, res) => {
  const result = await productsCollection.find().toArray();
  res.send(result);
});

//delete product

app.delete("/admin/products/:id", async (req, res) => {
  const id = req.params.id;

  const result = await productsCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

//products status
app.patch("/admin/products/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const result = await productsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
      },
    }
  );

  res.send(result);
});

//analytics api
app.get("/analytics/admin", async (req, res) => {
  res.send({
    userGrowth: [10, 20, 30, 50],
    orders: [5, 15, 25, 40],
    categories: {
      electronics: 40,
      fashion: 30,
      home: 30,
    },
  });
});
//get buyer stats
app.get("/buyer/stats", async (req, res) => {
  const buyerId = req.query.userId;

  const totalOrders = await ordersCollection.countDocuments({
    "buyerInfo.userId": buyerId,
  });

  const wishlistCount = await wishlistCollection.countDocuments({
    userId: buyerId,
  });

  const recentPurchases = await ordersCollection
    .find({ "buyerInfo.userId": buyerId })
    .sort({ _id: -1 })
    .limit(5)
    .toArray();

  res.send({
    totalOrders,
    wishlistCount,
    recentPurchases,
  });
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