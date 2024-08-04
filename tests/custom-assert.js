module.exports = function(response, context) {
  const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

  // Check if the user ID matches the userId given in context
  // console.log(body);
  // console.log(context.variables);
  if (body.id !== context.variables.newUserId) {
    throw new Error("User ID mismatch");
  }

  // Make sure your email is formatted correctly
  if (!body.email.includes('@')) {
    throw new Error("Invalid email format");
  }
};
