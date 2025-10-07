import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js';
import vaultRoutes from './routes/vault.js';
dotenv.config()

const app = express()

const PORT = process.env.PORT || 3800
console.log(PORT,"PORT")
const allowedOrigins = [
    
    'http://localhost:5173'
    // 'https://mern-insta-ten.vercel.app'

]


const corsOptions = {
    origin:allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials:true,
     allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

connectDB().then(()=>{
app.listen(PORT,()=>{
    console.log(`http://localhost:${PORT}`)
})
})
