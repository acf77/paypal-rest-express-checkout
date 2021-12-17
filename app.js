const express = require("express");
const ejs = require('ejs');
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

// Payment request

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


//Billing agreement request
app.post("/agreement", (req, res) => {
  const date = new Date();
  date.setSeconds(date.getSeconds() + 4);

  const billingPlanAttribs = {
    name: "Food of the World Club Membership: Standard",
    description: "Monthly plan for getting the t-shirt of the month.",
    type: "fixed",
    payment_definitions: [
      {
        name: "Standard Plan",
        type: "REGULAR",
        frequency_interval: "1",
        frequency: "MONTH",
        cycles: "11",
        amount: {
          currency: "BRL",
          value: "19.99",
        },
      },
    ],
    merchant_preferences: {
      setup_fee: {
        currency: "BRL",
        value: "1",
      },
      cancel_url: "http://localhost:3000/cancel",
      return_url: "http://localhost:3000/processagreement",
      max_fail_attempts: "0",
      auto_bill_amount: "YES",
      initial_fail_amount_action: "CONTINUE",
    },
  };

  const billingPlanUpdateAttributes = [
    {
      op: "replace",
      path: "/",
      value: {
        state: "ACTIVE",
      },
    },
  ];

  paypal.billingPlan.create(billingPlanAttribs, function (error, billingPlan) {
    if (error) {
      console.log(error);
      throw error;
    } else {
      // Activate the plan by changing status to Active
      paypal.billingPlan.update(
        billingPlan.id,
        billingPlanUpdateAttributes,
        function (error, response) {
          if (error) {
            console.log(error);
            throw error;
          } else {
            console.log(billingPlan.id);
          }
        }
      );
    }

    const billingAgreementAttributes = {
      name: "Fast Speed Agreement",
      description: "Agreement for Fast Speed Plan",
      start_date: date,
      plan: {
        id: billingPlan.id,
      },
      payer: {
        payment_method: "paypal",
      },
      shipping_address: {
        line1: "StayBr111idge Suites",
        line2: "Cro12ok Street",
        city: "San Jose",
        state: "CA",
        postal_code: "95112",
        country_code: "US",
      },
    };

    paypal.billingAgreement.create(
      billingAgreementAttributes,
      function (error, billingAgreement) {
        if (error) {
          console.error(error);
          throw error;
        } else {
          //capture HATEOAS links
          var links = {};
          billingAgreement.links.forEach(function (linkObj) {
            links[linkObj.rel] = {
              href: linkObj.href,
              method: linkObj.method,
            };
          });

          //if redirect url present, redirect user
          if (links.hasOwnProperty("approval_url")) {
            res.redirect(links["approval_url"].href);
          } else {
            console.error("no redirect URI present");
          }
        }
      }
    );
  });
});

app.get("/processagreement", function (req, res) {
  const token = req.query.token;

  paypal.billingAgreement.execute(
    token,
    {},
    function (error, billingAgreement) {
      if (error) {
        console.error(error);
        throw error;
      } else {
        console.log(JSON.stringify(billingAgreement));
        res.send("Billing Agreement Created Successfully");
      }
    }
  );
});


app.listen(3000, () => console.log("Server Started"));
