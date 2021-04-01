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
            RETURNING id, comp_code, amt, paid, add_date, paid_date`
        )

    testComps = compRes.rows;
    testInvs = invRes.rows;
})

afterAll(async () => {
    await db.query(`DELETE FROM invoices`)
    await db.query(`DELETE FROM companies`)
    await db.end();
})

// GET /companies

describe("GET /companies", function() {
    test("Gets list of 2 companies", async function() {
        const res = await request(app).get(`/companies`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            companies: [
                {code: testComps[0].code, name: testComps[0].name}, 
                {code: testComps[1].code, name: testComps[1].name}, 
            ]})
    })
})

// GET /companies/:code

describe("GET /companies/:id", () => {
    test("GET /companies/:id gets all info of a company", async () => {
        const comp = testComps[0]
        const res = await request(app).get(`/companies/${comp.code}`)
        expect(res.statusCode).toEqual(200)
        expect(res.body).toEqual({
            company: {
                code: comp.code,
                name: comp.name,
                description: comp.description,
                invoices: [testInvs[0].id]
            }
        })
    })

    test("GET returns 404 when company code doesn't exist", async () => {
        const res = await request(app).get('/companies/IntentionallyBadCompany')
        expect(res.statusCode).toEqual(404)
    })
})

// POST /companies

describe("POST /companies", () => {
    test("POST creates new companies", async () => {
        const res = await request(app)
        .post("/companies")
        .send({
            code: 'post',
            name: 'PostTestCompany',
            description: 'Fake company for post request testing'
        })
        expect(res.statusCode).toEqual(201)
        expect(res.body).toEqual({
            company: {
                code: 'post',
                name: 'PostTestCompany',
                description: 'Fake company for post request testing'
            }
        })
    })

    test('POST sends a 400 if request body does not have all 3 properties', async () => {
        const res = await request(app)
        .post("/companies")
        .send({
            code: "badpost",
        })
        expect(res.statusCode).toEqual(400)
    })
})

// PUT /companies/:code

describe("PUT /companies/:code", () => {
    test("PUT updates company information", async () => {
        const comp = testComps[0]
        const res = await request(app)
        .put(`/companies/${comp.code}`)
        .send({
            name: "New Company Name!",
            description: "New company description."
        })
        expect(res.statusCode).toEqual(200)
        expect(res.body).toEqual({
            company: {
                code: comp.code,
                name: "New Company Name!",
                description: "New company description."
            }
        })
    })

    test("PUT sends a 404 if company not found", async () => {
        const res = await request(app)
        .put("/companies/NotRealCompanyName")
        .send({
            name: "No",
            description: "This wont work"
        })
        expect(res.statusCode).toEqual(404)
    })
})

// DELETE /companies/:code

describe("DELETE /companies/:code", () => {
    test("PUT updates company information", async () => {
        const comp = testComps[0]
        const res = await request(app)
        .delete(`/companies/${comp.code}`)
        expect(res.statusCode).toEqual(200)
        expect(res.body).toEqual({
            message: `Company ${comp.name} (${comp.code}) deleted`
        })
    })

    test("DELETE sends a 404 if company not found", async () => {
        const res = await request(app)
        .delete("/companies/NotRealCompanyName")
        expect(res.statusCode).toEqual(404)
    })
})
