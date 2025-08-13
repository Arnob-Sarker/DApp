// requiring the contract
var Registration = artifacts.require("./Registration.sol");

// exporting as module 
 module.exports = function(deployer) {
  deployer.deploy(Registration);
 };