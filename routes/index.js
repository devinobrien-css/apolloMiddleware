const { Neo4jGraphQL } = require("@neo4j/graphql");
const { ApolloServer, gql } = require("apollo-server-express");
//const { ApolloServer } = require('apollo-server-express');
const neo4j = require("neo4j-driver");
//////////////////////////////////////////
var express = require('express');
var router = express.Router();
const cors = require('cors');

const mongoose = require('mongoose')
const mongoSchema = require("./schema")



async function connectToMongoDb() {
	await mongoose.connect("mongodb+srv://\n" +
		"youAssign:eZpMBpi72GntMYVB@cluster0.lxz54si.mongodb.net/?retryWrites=true&w=majority",
		() => {
			console.log("mongo connected successfully")
		},
		e => console.error(e)
	)
}
 connectToMongoDb()

//////////////////////////////////////////
const AURA_ENDPOINT = "neo4j+s://d972d6ed.databases.neo4j.io";
const USERNAME = "neo4j";
const PASSWORD = "HIFRdWEIBLOxy5RKTZevQfNeQfnsrvPAUO_vlepCWiU";

const driver = neo4j.driver(AURA_ENDPOINT, neo4j.auth.basic(USERNAME, PASSWORD));

const typeDefs = gql`
	type User {
		first: String
		last: String
		slug: String
		email: String
		position: String
		bio: String
		date_joined: String
		img:String
		roles: [Role!]! @relationship(type: "HAS_ROLE", direction:OUT)
		projects: [Project!]! @relationship(type: "IS_ON_PROJECT", direction:OUT)
		companies: [Company!]! @relationship(type: "IS_A_MEMBER_OF", direction:OUT)
		skills: [Skill!]! @relationship(type: "HAS_SKILL", properties: "HasSkill", direction: OUT)
		user_connections_out: [User!]! @relationship(type: "HAS_CONNECTION", direction: OUT)
		user_connections_in: [User!]! @relationship(type: "HAS_CONNECTION", direction: IN)
	}

	type Role {
		title: String
		permissions: [Permission!]! @relationship(type: "HAS_PERMISSION", direction:OUT)
		users: [User!]! @relationship(type: "HAS_ROLE", direction:IN)
	}

	type Permission {
		id: ID! @id
		name: String!
		access: String!
		resource :String!
		roles: [Role!]! @relationship(type: "HAS_PERMISSION", direction:IN)
	}

  	type Skill {
		id: ID! @id
		title: String
		img_src: String
		description: String
		date_added: String
		users: [User!]! @relationship(type: "HAS_SKILL", properties: "HasSkill", direction: IN)
		categories: [Category!]! @relationship(type: "IS_IN_CATEGORY", direction: OUT)
		projects: [Project!]! @relationship(type: "USED_BY_PROJECT", direction: IN)
	}

	type Category {
		title: String!
		color: String!
		skills : [Skill!]! @relationship(type: "IS_IN_CATEGORY", direction: IN)
	}  

	type Company {
		id: ID! @id
		name: String!
		logo: String
		backgroundImage: String
		description: String
		employees: [User!]! @relationship(type:"IS_A_MEMBER_OF", direction:IN)
	}

	type Project {
		id: ID! @id
		title: String
		description: String
		skills_required : [Skill!]! @relationship(type: "REQUIRES_SKILL", direction: OUT)
		clients: [User!]! @relationship(type:"HAS_PROJECT",direction:IN)
		employees: [User!]! @relationship(type:"IS_ON_PROJECT", properties:"IsOnProject", direction:IN)
	}

	interface HasSkill @relationshipProperties {
		rating: Int!
		description: String
		isShowcased: Boolean
	} 

	interface IsOnProject @relationshipProperties {
		date_assigned: String!
		role: String
	} 
`;

const neo4jGraphQL = new Neo4jGraphQL({
  typeDefs,
  driver
});
startApolloServer();

async function startApolloServer() {
	neo4jGraphQL.getSchema().then(async (schema) => {
		
		const server = new ApolloServer({
			schema,
			context: {
				driverConfig: {
					database: "neo4j"
				},
				context: async ({ req }) => {
					const something = getSomething(req)
					return { something }
				},
			}
		});
/////////////////////////
const app = express(); //todo: this recently added, seems to work perfectly fine
		//app.use(cors);
		app.listen(3000, () => {
			console.log('Server listening on port 3000');
		});
await server.start();
server.applyMiddleware({app}); //todo: apply cors here if needed
  
  
// app.use((req, res) => {
//   res.status(200);
//
//   res.send('we love a good middleware :)');
//
//   res.end();
// });

		// app.get(async (req, res) => {
		// 	const filter = {};
		// 	res.send('getting somehting here');
		// 	const all = await mongoSchema.find(filter, function (err, result) {
		// 		if (!err) {
		// 			console.log(result)
		// 			res.send('getting somehting here'+result);
		// 			//res.json(result);
		// 		} else {
		// 			res.send('bad outcome here');
		// 			throw err;
		// 		}
		// 	}).clone().catch(function (err) {
		// 		console.log(err)
		// 		res.send('bad outcome here');
		// 	})
		// });



/////////////////////////////////////////// GET METHODS
		app.get('/payroll/getAllEntries',cors(), async (req, res) => {
			const filter = {};
			const all = await mongoSchema.find(filter, function(err, result){
				if (!err) {
					res.json(result);
				} else {
					throw err;
				}
			}).clone().catch(function (err) {console.log(err)
			})
		});

		app.get('/payroll/findByKey',cors(), async (req, res) => {

			//const filter = {key: req.query.key}; //todo: need this for client
			const filter = {key: req.key}
			console.log(JSON.stringify(req.params))
			console.log(req.body)
			const searchResult = await mongoSchema.find(filter, function(err, result){
				if (!err) {
					res.json(result);
				} else {
					throw err;
				}
			}).clone().catch(function (err) {console.log(err)
			})
		});








////////////////////////////////////////////////////////////////////////////////////////////
await new Promise(resolve => app.listen({ port: 4000 }, resolve));

  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
console.log("finish line");
	});


 
}
