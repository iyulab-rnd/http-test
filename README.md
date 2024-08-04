# http-test

http-test는 HTTP 요청을 정의하고 테스트하기 위한 강력한 도구입니다. 이 문서는 http-test의 사용 방법과 주요 기능을 설명합니다.

## 목차
1. [기본 구조](#1-기본-구조)
2. [변수 정의](#2-변수-정의)
3. [테스트 요청 정의](#3-테스트-요청-정의)
4. [응답 검증](#4-응답-검증)
5. [변수 활용](#5-변수-활용)
6. [환경 변수](#6-환경-변수)
7. [사용자 정의 JavaScript 검증](#7-사용자-정의-javascript-검증)
8. [테스트 실행](#8-테스트-실행)
9. [규약](#9-규약)

## 1. 기본 구조

http-test 파일은 다음과 같은 기본 구조를 가집니다:

```http
# 변수 정의
@host = https://api.example.com
@authToken = your_auth_token_here

### TEST_{number: x.?.?.?}: (# 세개로 시작합니다.)
요청 메서드 URL
헤더

요청 본문 (필요한 경우)

#### {method:Assert(default)}: 응답 검증 (# 네개로 시작합니다.)
```

## 2. 변수 정의

테스트에서 재사용할 변수를 정의할 수 있습니다:

```http
@host = https://jsonplaceholder.typicode.com
@userId = 1
```

## 3. 테스트 요청 정의

각 테스트는 고유한 이름을 가지며, HTTP 메서드와 URL을 지정합니다:

```http
### GET_USER
GET {{host}}/users/{{userId}}
Content-Type: application/json
```

## 4. 응답 검증

응답을 검증하기 위해 Assert 블록을 사용합니다:

```http
### GET_USER
GET {{host}}/users/{{userId}}
Content-Type: application/json

#### Assert:
Status: 200
Content-Type: application/json
Body:
$.id: 1
$.name: /^.+$/
```

## 5. 변수 활용

이전 요청의 응답을 변수로 저장하고 후속 요청에서 활용할 수 있습니다:

```http
### CREATE_POST
POST {{host}}/posts
Content-Type: application/json

{
  "title": "New Post",
  "body": "This is a new post",
  "userId": {{userId}}
}

#### CHECK HEADERS // 생략할 경우 Assert로 인정됩니다.
Status: 201
Content-Type: application/json

# 응답에서 postId 추출
@postId = $.id

### GET_POST_COMMENTS
GET {{host}}/posts/{{postId}}/comments
Content-Type: application/json

#### Assert: 
Status: 200
Content-Type: application/json
Body:
$[*].postId: {{postId}}
```

## 6. 환경 변수

`variables.json` 파일을 사용하여 환경 변수를 관리할 수 있습니다:

```json
{
  "authToken": "your_auth_token_here",
  "apiVersion": "v1"
}
```

테스트 파일에서 이 변수들을 사용할 수 있습니다:

```http
### AUTHENTICATED_REQUEST
GET {{host}}/api/{{apiVersion}}/secure-endpoint
Authorization: Bearer {{authToken}}
```

## 7. 사용자 정의 JavaScript 검증

복잡한 검증 로직을 위해 사용자 정의 JavaScript 파일을 사용할 수 있습니다:

```http
### COMPLEX_VALIDATION
GET {{host}}/users/{{userId}}
Content-Type: application/json

#### Assert
Status: 200
Content-Type: application/json
< ./my-assert.js
```

`my-assert.js` 파일은 다음과 같이 작성할 수 있습니다:

```javascript
module.exports = function(response, context) {
  const body = JSON.parse(response.body);
  
  if (body.id !== context.userId) {
    throw new Error("User ID mismatch");
  }
  
  if (!body.email.includes('@')) {
    throw new Error("Invalid email format");
  }
  
  // 더 복잡한 검증 로직을 여기에 추가할 수 있습니다.
};
```

이 스크립트는 응답 본문을 파싱하고, 사용자 ID가 일치하는지, 이메일 형식이 올바른지 등을 확인합니다. 검증에 실패하면 에러를 throw합니다.

## 8. 테스트 실행

다음 명령어로 테스트를 실행합니다:

```bash
http-test ./test.http --verbose --var ./variables.json
```

## 9. 규약

http-test에서 사용하는 규약은 다음과 같습니다:

### Request Method

HTTP 요청은 다음의 메서드를 사용할 수 있습니다:
- GET
- POST
- PUT
- DELETE
- PATCH

### 복수개의 테스트

하나의 요청(###)에는 복수개의 테스트(####)를 포함할 수 있습니다. 각 테스트는 독립적으로 검증할 수 있습니다:

```http
### MULTI_TEST
GET {{host}}/posts
Content-Type: application/json

#### Assert: Status Code Test
Status: 200

#### Assert: Content-Type Test
Content-Type: application/json

#### Assert: Body Test
Body:
$[0].userId: 1
```