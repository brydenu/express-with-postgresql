const express = require("express")
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError")

router.get("/", async function(req, res, next) {
    try {
        const query = await db.query(`SELECT id, comp_code FROM invoices`)
        return res.json({invoices: query.rows})
    } catch (e) {
        return next(e)
    }
})

router.get("/:id", async function(req, res, next) {
    try {
        const query = await db.query(`
            SELECT id, amt, paid, add_date, paid_date, code, name, description  
            FROM invoices JOIN companies
            ON invoices.comp_code = companies.code
            WHERE id=$1`, [req.params.id]
            )
            if (query.rows.length === 0) {
                throw new ExpressError(`Invoice with id ${req.params.id} not found`)
            }
            const info = query.rows[0]
        return res.json({
            invoice: {
                id: info.id,
                amt: info.amt,
                paid: info.paid,
                add_date: info.add_date,
                paid_date: info.paid_date,
                company: {
                    code: info.code,
                    name: info.name,
                    description: info.description
                }
            }
         })
    } catch (e) {
        return next(e)
    }
})

router.post("/", async function(req, res, next) {
    try {
        const vals = [req.body.comp_code, req.body.amt, req.body.paid, req.body.add_date, req.body.paid_date]
        
        // Check all required body values
        if (vals.slice(0,4).includes(undefined)) {
            throw new ExpressError("Missing arguments. POST request body must include comp_code, amt, paid, and add_date", 400)
       
        // If there is no paid_date, that's okay unless "paid" is true. If "paid" is true
        // without a paid_date, throw an error
        } else if (vals[4] == undefined) {
            if (vals[2]) {
                throw new ExpressError("Paid invoices must include a paid_date", 400)
            } else {
                vals[4] = null;
            }
        }
        const query = await db.query(`
            INSERT INTO invoices
            (comp_code, amt, paid, add_date, paid_date)
            VALUES
            ($1, $2, $3, $4, $5)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, 
            vals
        )

        return res.status(201).json({invoice: query.rows[0]})
    } catch (e) {
        return next(e)
    }
})

router.put("/:id", async function(req, res, next) {
    try {
        const query = await db.query(`
        UPDATE invoices 
        SET amt=$1
        WHERE id=$2
        RETURNING id, comp_code, amt, paid, add_date, paid_date`, [req.body.amt, req.params.id]
        )

        if (query.rows.length === 0) {
            throw new ExpressError(`Invoice with id ${req.params.id} not found`, 404)
        }

        return res.status(200).json({invoice: query.rows[0]})
    } catch (e) {
        return next(e)
    }
})

router.delete("/:id", async function(req, res, next) {
    try {
        const query = await db.query(`
        DELETE FROM invoices 
        WHERE id = $1
        RETURNING id`, [req.params.id]
        )

        if (query.rows.length === 0) {
            throw new ExpressError(`Invoice with id ${req.params.id} not found`, 404)
        }

        return res.json({message: `Invoice ${req.params.id} deleted.`})
    } catch(e) {
        return next(e)
    }
})

module.exports = router;