process.env.NODE_ENV = "test";

const request = require("supertest")
const app = require("../app")
const db = require("../db")
const helpers = require("./testHelpers")

let testComps;
let testInvs;

beforeEach(async () => {
    const queries = [
        db.query(`DELETE FROM invoices`),
        db.query(`DELETE FROM companies`)]
    await Promise.all(queries)
    
    const compRes = await db.query(`
            INSERT INTO companies
            (code, name, description)
            VALUES 
            ('test', 'testCompany', 'This is a test company'),
            ('test2', 'testCompany2', 'Test company 2 description')
            RETURNING code, name, description`
        )

    const invRes = await db.query(`
            INSERT INTO invoices
            (comp_code, amt, paid, add_date, paid_date)
            VALUES
            ('test', 400, true, '01/01/2021', '01/01/2021'),
            ('test2', 50, true, '02/08/2020', '02/12/2020')
            RETURNING id, amt, paid, add_date, paid_date, comp_code`
        )

    testComps = compRes.rows;
    testInvs = invRes.rows;
})

afterAll(async () => {
    await db.query(`DELETE FROM invoices`)
    await db.query(`DELETE FROM companies`)
    await db.end();
})

// GET /invoices

describe('GET /invoices', () => {
    test('Get list of 2 invoices', async () => {
        const res = await request(app).get("/invoices");
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            invoices: [
                {comp_code: testInvs[0].comp_code, id: testInvs[0].id},
                {comp_code: testInvs[1].comp_code, id: testInvs[1].id}
            ]
        })
    })
})

describe('GET /invoices/:id', () => {
    test('GET information about a valid invoice', async () => {
        const inv = testInvs[0];
        inv.company = {code: testComps[0].code, name: testComps[0].name, description: testComps[0].description}
        const res = await request(app).get(`/invoices/${inv.id}`)
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            invoice: {
                id: inv.id,
                amt: inv.amt,
                paid: inv.paid,
                add_date: res.body.invoice.add_date,
                paid_date: res.body.invoice.paid_date,
                company: {
                    code: inv.company.code,
                    name: inv.company.name,
                    description: inv.company.description
                }
            }
        })
    })

    test('GET should return 404 for invalid invoice', async() => {
        const res = await request(app).get("/invoices/0")
        expect(res.statusCode).toEqual(500)
    })
})

// POST /invoices

describe('POST /invoices', () => {
    test('POST information with a proper body', async () => {
        const res = await request(app)
        .post("/invoices")
        .send({
            comp_code: "test",
            amt: 200,
            paid: true,
            add_date: "01/01/01",
            paid_date: "02/02/02"
        })
        expect(res.statusCode).toEqual(201)
        expect(res.body).toEqual({
            invoice: {
                id: expect.any(Number),
                comp_code: "test",
                amt: 200,
                paid: true,
                add_date: res.body.invoice.add_date,
                paid_date: res.body.invoice.paid_date
            }
        })
    })

    test('POST request must include all request body parameters', async () => {
        const res = await request(app)
        .post("/invoices")
        .send({
            irrelevant_info: "this is not the right request body"
        })
        expect(res.statusCode).toEqual(400)
        expect(res.body.error).toEqual({
                message: "Missing arguments. POST request body must include comp_code, amt, paid, and add_date",
                status: 400
        })
    })

    test('POST route will change paid_date to null if not paid and omitted', async () => {
        const res = await request(app)
        .post("/invoices")
        .send({
            comp_code: "test",
            amt: 200,
            paid: false,
            add_date: "01/01/01"
        })
        expect(res.statusCode).toEqual(201)
        expect(res.body).toEqual({
            invoice: 
            {
                id: expect.any(Number),
                comp_code: "test",
                amt: 200,
                paid: false,
                add_date: res.body.invoice.add_date,
                paid_date: null
            }
        })
    })

    test('POST route will send 400 if paid is true but paid_date omitted', async () => {
        const res = await request(app)
        .post("/invoices")
        .send({
            comp_code: "test",
            amt: 200,
            paid: true,
            add_date: "01/01/01"
        })
        expect(res.statusCode).toEqual(400)
        expect(res.body.error).toEqual({
            message: "Paid invoices must include a paid_date",
            status: 400
        })
    })
})

// PUT /invoices/:id

describe("PUT /invoices/:id", () => {
    test("PUT requests update amt", async () => {
        const inv = testInvs[0]
        const res = await request(app)
        .put(`/invoices/${inv.id}`)
        .send({
            amt: 1
        })
        expect(res.statusCode).toEqual(200)
        expect(res.body).toEqual({
            invoice: {
                id: inv.id,
                comp_code: inv.comp_code,
                amt: 1,
                paid: inv.paid,
                add_date: res.body.invoice.add_date,
                paid_date: res.body.invoice.paid_date
            }
        })
    })

    test("PUT request sends 404 for invalid invoice", async () => {
        const res = await request(app)
        .put("/invoices/0")
        .send({
            amt: 1
        })
        expect(res.statusCode).toEqual(404)
    })
})

// DELETE //invoices/:id

describe("DELETE /invoices/:id", () => {
    test("DELETE successfully deletes invoices", async () => {
        const inv = testInvs[0]
        const res = await request(app)
        .delete(`/invoices/${inv.id}`)
        expect(res.statusCode).toEqual(200)
        expect(res.body).toEqual({
            message: `Invoice ${inv.id} deleted.`
        })
    })

    test("DELETE request sends 404 for invalid invoice", async () => {
        const res = await request(app)
        .delete("/invoices/0")
        expect(res.statusCode).toEqual(404)
    })
})

