const express =require("express")

const splitroutes=require('./group')
const app=express()
const router =express.Router()



router.use('/group',splitroutes);
  
module.exports=router;