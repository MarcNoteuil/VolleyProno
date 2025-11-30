"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Auth Integration Tests', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: `newuser${Date.now()}@example.com`,
                pseudo: `newuser${Date.now()}`,
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send(userData);
            console.log('Register response:', response.status, response.body);
            if (response.status !== 201) {
                console.log('Register failed:', response.body);
            }
            expect(response.status).toBe(201);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.email).toBe(userData.email);
            expect(response.body.data.pseudo).toBe(userData.pseudo);
        });
        it('should return validation error for invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                pseudo: 'testuser',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });
        it('should return error for duplicate email', async () => {
            const timestamp = Date.now();
            const userData = {
                email: `duplicate${timestamp}@example.com`,
                pseudo: `testuser${timestamp}`,
                password: 'password123'
            };
            // Premier enregistrement
            const firstResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send(userData);
            console.log('First register response:', firstResponse.status, firstResponse.body);
            if (firstResponse.status !== 201) {
                console.log('First register failed with details:', firstResponse.body.details);
            }
            expect(firstResponse.status).toBe(201);
            // Deuxième enregistrement avec le même email
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send(userData);
            console.log('Duplicate register response:', response.status, response.body);
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('ERROR');
        });
    });
    describe('POST /api/auth/login', () => {
        let testEmail;
        beforeEach(async () => {
            const timestamp = Date.now();
            testEmail = `test${timestamp}@example.com`;
            // Créer un utilisateur de test
            const registerResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({
                email: testEmail,
                pseudo: `testuser${timestamp}`,
                password: 'password123'
            });
            console.log('Register in beforeEach:', registerResponse.status, registerResponse.body);
            expect(registerResponse.status).toBe(201);
        });
        it('should login successfully with correct credentials', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: testEmail,
                password: 'password123'
            });
            console.log('Login response:', response.status, response.body);
            expect(response.status).toBe(200);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });
        it('should return error with incorrect credentials', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: testEmail,
                password: 'wrongpassword'
            })
                .expect(401);
            expect(response.body.code).toBe('ERROR');
        });
    });
    describe('POST /api/auth/refresh', () => {
        let refreshToken;
        let testEmail;
        beforeEach(async () => {
            const timestamp = Date.now();
            testEmail = `test${timestamp}@example.com`;
            // Créer un utilisateur et se connecter
            const registerResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({
                email: testEmail,
                pseudo: `testuser${timestamp}`,
                password: 'password123'
            });
            console.log('Register in refresh beforeEach:', registerResponse.status, registerResponse.body);
            expect(registerResponse.status).toBe(201);
            const loginResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: testEmail,
                password: 'password123'
            });
            console.log('Login in refresh beforeEach:', loginResponse.status, loginResponse.body);
            expect(loginResponse.status).toBe(200);
            refreshToken = loginResponse.body.data.refreshToken;
        });
        it('should refresh token successfully', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/refresh')
                .send({ refreshToken })
                .expect(200);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data).toHaveProperty('accessToken');
        });
        it('should return error with invalid refresh token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);
            expect(response.body.code).toBe('ERROR');
        });
    });
});
