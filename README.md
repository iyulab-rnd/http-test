# http-test

http-test is a powerful and user-friendly API testing library that allows you to easily write and execute API tests using simple .http files. With http-test, you can streamline your API testing process and ensure the reliability of your endpoints without writing complex test scripts.

## VS Code Extension

For an even easier experience, use the [http-test VS Code Extension](https://marketplace.visualstudio.com/items?itemName=iyulab.http-test). This extension provides seamless integration with Visual Studio Code, allowing you to run and manage your http-test files directly from the editor.

![VS Code Extension Screenshot](screenshot.png)

## Features

- Write tests in easy-to-read .http files
- Support for various HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Automatic assertion based on status codes
- Custom assertions for headers, body content, and more
- Variable management for dynamic request data
- File upload testing support
- Detailed test reports and summaries

## Quick Start

1. Create a .http file with your API tests (see [full example](tests/test_server.http))

2. Run the tests:

```bash
npx http-test path/to/your/tests.http
```

## Install

```bash
npm install @iyulab/http-test -g

http-test path/to/your/tests.http
```

## Writing Tests

http-test uses a simple syntax for defining API tests in .http files:

- Use `###` to start a new test case
- Specify the HTTP method and URL on the next line
- Add headers and request body as needed
- Use `####` to define assertions
- Assertions can check status codes, headers, and body content

Here's a more comprehensive example:

```http
### GET all users
GET {{host}}/users

#### Assert: Check all users
Status: 200
Content-Type: application/json
Body:
$[0].id: 1
$[0].name: John Doe
$[1].id: 2
$[1].name: Jane Smith

### POST new user
POST {{host}}/users
Content-Type: application/json

{
  "name": "Alice Johnson",
  "email": "alice@example.com"
}

#### Assert: Check new user creation
Status: 201
Content-Type: application/json
Body:
$.name: Alice Johnson
$.email: alice@example.com

# Save new user ID to variable
@newUserId = $.id

### GET new user
GET {{host}}/users/{{newUserId}}

#### Assert: Verify new user
Status: 200
Content-Type: application/json
Body:
$.name: Alice Johnson
$.email: alice@example.com

### DELETE user
DELETE {{host}}/users/{{newUserId}}

#### Assert: Check user deletion
Status: 204

### Verify user deleted
GET {{host}}/users/{{newUserId}}

#### Assert: Verify user not found
Status: 404
Content-Type: application/json
Body:
$.error: User not found
```

## Advanced Features

- **Variables**: Use `@variableName = value` to define variables and `{{variableName}}` to use them in requests
- **File Uploads**: Test file uploads using multipart/form-data
- **Custom Validators**: Write custom JavaScript functions for complex validations

For more advanced examples, check our [full test suite](tests/test_server.http).

## Example Output

When you run your tests, http-test provides a detailed summary of the results:

```
==================================================
📊 Test Summary
==================================================
Total Tests: 24
Passed Tests: 24
Failed Tests: 0

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
  1. GET all users Assert: Check all users: ✅ PASS (Status: 200)
  2. POST new user Assert: Check new user creation: ✅ PASS (Status: 201)
  3. GET new user Assert: Verify new user: ✅ PASS (Status: 200)
  4. DELETE user Assert: Check user deletion: ✅ PASS (Status: 204)
  5. Verify user deleted Assert: Verify user not found: ✅ PASS (Status: 404)
  ...
```
