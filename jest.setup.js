// Add chrome object to global scope
Object.assign(global, require('jest-chrome'));

// set debug flag
global.__DEBUG__ = false;
