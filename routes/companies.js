const express = require("express");
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError")

router.get("/", async function(req, res, next) {
    try {
        const query = await db.query("SELECT code, name FROM companies")
        return res.json({companies: query.rows})
    } catch (e) {
        return next(e)
    }
})

router.get("/:code", async function(req, res, next) {
    try {
        const query = await db.query(`
            SELECT code, name, description
            FROM companies
            WHERE code = $1`, [req.params.code])
        const invoices = await db.query(`
            SELECT id
            FROM invoices
            WHERE comp_code = $1`, [req.params.code])
        
        if (query.rows.length === 0) {
            throw new ExpressError(`Company with code ${req.params.code} not found.`, 404)
        }

        query.rows[0].invoices = invoices.rows.map(inv => inv.id)

        return res.json({company: query.rows[0]})
    } catch(e) {
        next(e)
    }
})

router.post("/", async function(req, res, next) {
    try {
        const vals = [req.body.code, req.body.name, req.body.description];
        if (vals.includes(undefined)) {
            throw new ExpressError("Missing parameters. Request body must include code, name, and description", 400)
        }

        const result = await db.query(`
            INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, vals
        );

        return res.status(201).json({company: result.rows[0]})
    } catch (e) {
        next(e)
    }
})

router.put("/:code", async function(req, res, next){
    try{
        const result = await db.query(`
            UPDATE companies 
            SET name=$1, description=$2
            WHERE code=$3
            RETURNING code, name, description`, [req.body.name, req.body.description, req.params.code]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Company with code ${req.params.code} not found`, 404)
        }
    
        return res.status(200).json({company: result.rows[0]})
    } catch (e) {
        next(e);
    }
})

router.delete("/:code", async function(req, res, next){
    try{
        const result = await db.query(`
            DELETE FROM companies 
            WHERE code=$1
            RETURNING code, name`, [req.params.code]
        )

        if (result.rows.length == 0) {
            throw new ExpressError(`Company with code ${req.params.code} not found`, 404)
        }

        return res.json({message: `Company ${result.rows[0].name} (${result.rows[0].code}) deleted`})
    } catch (e) {
        next(e)
    }
})

module.exports = router;