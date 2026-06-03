export const registerUser = async (userData) => {
  return { id: 'user-id', username: userData.username };
};

export const loginUser = async (credentials) => {
  return { token: 'jwt-token' };
};
