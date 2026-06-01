import dotenv from "dotenv"
dotenv.config()
import e from "express"

const app = e()

//  Test Route 
app.get("/", (req, res) => {
    res.send("API is running")
})


// Selects Port number from env and fallbacks to 5000 if not found
const PORT = process.env.PORT || 5000

// Server runs on this port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})