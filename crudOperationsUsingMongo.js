const express = require('express');
const mongoose = require("mongoose");
const app = express();

mongoose.connect("mongodb+srv://harsha_kota:harsha369@cluster0.flwjgmu.mongodb.net/studentsDB?retryWrites=true&w=majority&appName=Cluster0")
.then(()=>{
        console.log("connected to mogodb");
})
.catch((err)=>{
    console.log(`connection error:-- ${err}`);
})

const studentsSchema = new mongoose.Schema({
      name:String,
      rollNo:String,
      scores:{
        Java:Number,
        CPP:Number,
        Python:Number,
        GenAI:Number,
        FSD:Number,
      },
});

const students = mongoose.model("students",studentsSchema);

app.use(express.json());

app.listen(3000,()=>{
    console.log(`Sever is started at port http://localhost:3000`);
})

app.get("/data/:rollNo", async (req,res)=>{
    let {rollNo} = req.params;
     const query = await students.findOne({rollNo:{$eq:rollNo}});   
     try{
     if(query){
        res.status(200).json({message:"Student not found",query});
      }else{
        res.status(404).json({message:"Student not found"});
      }
    }catch(err){
        res.status(500).json({message:"Error fetching data",error:err});
    }

});

app.post("/data/", async (req,res)=>{
    try{
    const query = new students(req.body);
    await query.save();
    res.status(202).json({message:"student added successfully",query});
    }catch(err){
          res.status(400).json({message:"Error in fetching data",error:err});
    }
});

app.delete("/data/:rollNo",async (req,res)=>{
    try{
        let {rollNo} = req.params;
         const query = await students.deleteOne({rollNo:{$eq:rollNo}});
          res.status(202).json({message:"Student deleted successfully",query});
    }catch(err){
        res.status(400).json({message:"Error in fetching data",error:err});
    }
});


app.put("/data/:rollNo",async (req,res)=>{
       try{
          let {rollNo} = req.params;
          let updatedData = req.body;
          let query = await students.findOneAndUpdate({rollNo:rollNo},{$set:updatedData},{new:true,runValidators:true});
          if(query){
            res.status(200).json({message:"Data updated",query});
          }else{
            res.status(404).json({message:"Student not found"});
          }
       }catch(err){
        res.status(500).json({message:"Error"},{error:err});
       }
});


app.delete("/data/:rollNo",async (req,res)=>{
    try{
        let {rollNo} = req.params;
         const query = await students.deleteMany({rollNo:{$eq:rollNo}});
          res.status(202).json({message:"Student deleted successfully",query});
    }catch(err){
        res.status(400).json({message:"Error in fetching data",error:err});
    }
});


app.get("/data/", async (req,res)=>{
    //let {rollNo} = req.params;
     const query = await students.find();   
     try{
           const queryOut = query.map((queryData)=>{
       
            let {Java,CPP,Python,GenAI,FSD} = queryData.scores;
               const totalGpa = ((Java+CPP+Python+GenAI+FSD)/5).toFixed(2);
              return{
                name:queryData.name,
                rollNo:queryData.rollNo,
                totalGpa
              };
           });
               res.status(200).json({StudentsWaalaResult:queryOut});
          
        
         
    }catch(err){
        res.status(500).json({message:"Error fetching data",error:err});
    }

});