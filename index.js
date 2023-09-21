const AWS = require("aws-sdk");

AWS.config.update({
    region: "us-east-1",
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dbTableName = "product-inventory";

const healthPath = "/health";
const productPath = "/product";
const productsPath = "/products";

exports.handler = async function (event) {
    console.log("Request event", event);
    let response;
    switch (true) {
        case event.httpMethod === "GET" && event.path === healthPath:
            response = buildResponse(200);
            break;
        case event.httpMethod === "GET" && event.path === productPath:
            response = getProduct(event.queryStringParameters.productId);
            break;
        case event.httpMethod === "GET" && event.path === productsPath:
            response = getProducts();
            break;
        case event.httpMethod === "POST" && event.path === productPath:
            response = saveProduct(JSON.parse(event.body));
            break;
        case event.httpMethod === "PATCH" && event.path === productPath: {
            const { productId, key, value } = JSON.parse(event.body);
            response = modifyProduct(productId, key, value);
            break;
        }
        case event.httpMethod === "DELETE" && event.path === productPath: {
            const { productId } = JSON.parse(event.body);
            response = deleteProduct(productId);
            break;
        }
        default: {
            response = buildResponse(404, "404 not found");
        }
    }
    return response;
};

const buildResponse = (statusCode, body = {}) => {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
};

const getProduct = async (productId) => {
    const params = {
        TableName: dbTableName,
        Key: {
            "productId" : productId,
        },
    };
    return await dynamodb
        .get(params)
        .promise()
        .then(
            (response) => buildResponse(200, response),
            (err) => {
                console.log(err);
            }
        );
};

const scanDynamoRecords = async (params, itemArray) => {
    try {
        const data = await dynamodb.scan(params).promise();
        itemArray = itemArray.concat(data.Items);
        if (data.LastEvaluatedKey) {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            return scanDynamoRecords(params, itemArray);
        }
        return itemArray;
    } catch (err) {
        console.log(err);
    }
};
const getProducts = async () => {
    const params = {
        TableName: dbTableName,
    };
    const allProducts = await scanDynamoRecords(params, []);
    return buildResponse(200, { products: allProducts });
};

const saveProduct = async (data) => {
    const params = {
        TableName: dbTableName,
        Item: data,
    };
    return await dynamodb
        .put(params)
        .promise()
        .then(
            (response) =>
                buildResponse(200, {
                    Operation: "SAVE",
                    Message: "SUCCESS",
                    Iten: response,
                }),
            (err) => {
                console.log(err);
            }
        );
};

const modifyProduct = async (productId, key, value) => {
    const params = {
        TableName: dbTableName,
        Key: {
            "productId" : productId,
        },
        UpdateExpression: `set ${key} = :value`,
        ExpressionAttributeValues: {
            ":value": value,
        },
        returnValues: "UPDATE_NEW",
    };
    return await dynamodb
        .update(params)
        .promise()
        .then(
            (response) =>
                buildResponse(200, {
                    Operation: "UPDATE",
                    Message: "SUCCESS",
                    Iten: response,
                }),
            (err) => {
                console.log(err);
            }
        );
};

const deleteProduct = async (productId) => {
    const params = {
        TableName: dbTableName,
        Key: {
            "productId" : productId,
        },
    };
    return await dynamodb
        .delete(params)
        .promise()
        .then(
            (response) =>
                buildResponse(200, {
                    Operation: "DELETE",
                    Message: "SUCCESS",
                    Iten: response,
                }),
            (err) => {
                console.log(err);
            }
        );
};
