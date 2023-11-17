const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');


//middleware
app.use(cors({
    origin: ['http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qb7mmsc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = async(req, res, next) =>{
    const token = req.cookies?.token;
    console.log('Value of token in middleware, token')
    
    if(!token){
        return res.status(401).send({ message: 'forbidden' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
            return res.status(401).send({message: 'unauthorized'})
        }
        console.log('vale in the token', decoded)
        req.user = decoded;
        next()
    })
    
}


async function run() {
  try {
    
    await client.connect();

    const roomsCollection = client.db("luxuryHOTELS").collection("rooms");
    const userCollection = client.db("luxuryHOTELS").collection("user");
    const subscribeCollection = client
      .db("luxuryHOTELS")
      .collection("subscribe");
    const careerCollection = client.db("luxuryHOTELS").collection("career");
    const aboutUsCollection = client.db("luxuryHOTELS").collection("aboutUs");
    const bookingCollection = client.db("luxuryHOTELS").collection("booking");


    //auth 
    app.post('/jwt', async(req, res) =>{
        const user = req.body;
        console.log(user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res
        .cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'none'
        })
        .send({success: true});
    })


    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/career", async (req, res) => {
      const cursor = careerCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/aboutUs", async (req, res) => {
      const cursor = aboutUsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    //middleware
    const logger = async( req, res, next) =>{
        console.log('called:', req.hostname, req.originalUrl)
        next()
    }

    // const verifyToken = async(req, res, next) =>{
    //     const token = req.cookies?.token;
    //     console.log('Value of token in middleware, token')
        
    //     if(!token){
    //         return res.status(401).send({ message: 'forbidden' });
    //     }

    //     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    //         if(err){
    //             return res.status(401).send({message: 'unauthorized'})
    //         }
    //         console.log('vale in the token', decoded);
    //     })
    //     next()
    // }

    //myBookings
    app.get("/booking", logger, verifyToken, async (req, res) => {
        console.log(req.query.email);
        
        console.log('user in the valid token', req.user);
        if (req.query.email !== req.user.email) {
          return res.status(403).send({ message: 'forbidden access' });
        }
      
        let query = {};
        {
          query = { email: req.query.email };
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      });

    //user related apis
    app.post("/user", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //subscribe
    app.post("/subscribe", async (req, res) => {
      const subscribe = req.body;
      console.log(subscribe);
      const result = await subscribeCollection.insertOne(subscribe);
      res.send(result);
    });

    //bookRoom
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.patch('/booking/:id', async(req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateBooking = req.body;
        const updateDoc = {
          $set: {
            Date: updateBooking.date,
          },
        };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      });

    //add room to myCart
    // app.put("/user/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const { title, dateArray } = req.body.myCart;

    //   const roomExists = await userCollection.findOne({
    //     email: email,
    //     "myCart.title": title,
    //   });

    //   if (roomExists) {
    //     const result = await userCollection.updateOne(
    //       { email: email, "myCart.title": title },
    //       { $addToSet: { "myCart.$.dateArray": { $each: dateArray } } }
    //     );

    //     res.send(result);
    //   } else {
    //     const result = await userCollection.updateOne(
    //       { email: email },
    //       { $addToSet: { myCart: { title, dateArray } } },
    //       { upsert: true }
    //     );

    //     res.send(result);
    //   }
    // });

    //await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //review
    app.put("/rooms/:title/reviews", async (req, res) => {
      const title = req.params.title;
      const { email, reviews, rating } = req.body;

      const filter = { title: title };
      const update = {
        $addToSet: {
          reviews: { email, reviews, rating },
        },
      };

      try {
        const result = await roomsCollection.updateOne(filter, update);
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ message: "Internal Server Error", error: error.message });
      }
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

  } finally {
    await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Luxury Hotel!");
});

app.get("/users", (req, res) => {
  res.send("Luxury Hotel server is running");
});

app.listen(port, () => {
  console.log(`Luxury Hotel is running on port: ${port}`);
});
