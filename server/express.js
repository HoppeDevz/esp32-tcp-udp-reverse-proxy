const app = require("express")();

app.get("/", (req, res) => {

    res.status(200).send("Hello there!");
});

app.listen(9999);