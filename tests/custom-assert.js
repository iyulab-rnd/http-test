module.exports = function(response, context) {
    const body = JSON.parse(response.body);
  
    // 사용자 ID가 context에서 주어진 userId와 일치하는지 확인
    if (body.id !== context.newUserId) {
      throw new Error("User ID mismatch");
    }
  
    // 이메일 형식이 올바른지 확인
    if (!body.email.includes('@')) {
      throw new Error("Invalid email format");
    }
  };
  