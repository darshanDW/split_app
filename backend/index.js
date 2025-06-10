const express = require("express");
const app=express();

app.use(express.json())
const cors =require("cors")
app.use(cors())
const mainroute =require('./route/index')
require('dotenv').config();
const PORT= process.env.PORT || 3001;


app.use('/api/v1',mainroute)

app.listen(PORT);