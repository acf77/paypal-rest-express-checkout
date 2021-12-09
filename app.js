const express = require("express");
const ejs = require("ejs");
const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id:
    "AcAmMyF4Pdl_jqeIYD-QIiAa6_Ymlw5HUTyDMwV-FD2WDOrkb-0MLJmckMGKCW-F2w__3GGje6iM1wUD",
  client_secret:
    "ENv1Icom9j52rAv6Hz1jIRYWMroRh6ADnmhpWJ9qrXNufAXax8PAtDWJsp6hmwiTK4TAQm0qAWgVUBfL",
});

const app = express();

app.set("view engine", "ejs");

app.get("/", (req, res) => res.render("index"));

app.post("/pay", (req, res) => {
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: "Camisa do Flamengo",
              sku: "001",
              price: "25.00",
              currency: "BRL",
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: "BRL",
          total: "25.00",
        },
        description: "Camisa do Mengão",
      },
    ],
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === "approval_url") {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

app.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "BRL",
          total: "25.00",
        },
      },
    ],
  };

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        console.log(JSON.stringify(payment));
        res.send("Success");
      }
    }
  );
});

app.get("/cancel", (req, res) => res.send("Cancelled"));

app.listen(3000, () => console.log("Server Started"));
