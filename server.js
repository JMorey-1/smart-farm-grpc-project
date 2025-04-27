const grpc = require('@grpc/grpc-js');

const server = new grpc.Server();

const address = '0.0.0.0:50051';

server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
  
    if (error) {
        console.error('Server binding failed: ' + error);
        return;
      }
      console.log('gRPC Server is running at ' + address);

});