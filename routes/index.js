const { Neo4jGraphQL } = require("@neo4j/graphql");
const { ApolloServer, gql } = require("apollo-server-express");
const neo4j = require("neo4j-driver");

//var router = express.Router();
const express = require('express');
const cors = require('cors');
const bodyParser = require("express");

const mongoose = require('mongoose')
const mongoSchema = require("./schema")

async function connectToMongoDb() {
	await mongoose.connect("mongodb+srv://\n" +
		"youAssign:eZpMBpi72GntMYVB@cluster0.lxz54si.mongodb.net/?retryWrites=true&w=majority",
		() => {
			console.log("Mongodb connected successfully")
		},
		e => console.error(e)

	)
}

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

connectToMongoDb().then(r => {
	console.log("Mongodb connection started")
});
startApolloServer().then(r => {
	console.log("ApolloServer started")
});

const app = express(); //todo: this recently added, seems to be the way we want it
//app.use(cors);
app.use(bodyParser.json())
const currentPort=4001;
app.listen(currentPort, () => {
	console.log('Express Server listening on port '+currentPort);
});

async function startApolloServer() {
	neo4jGraphQL.getSchema().then(async (schema) => {
		const server = new ApolloServer({
			schema,
			context: {
				driverConfig: {
					database: "neo4j"
				},
				// context: async ({ req }) => { //todo remove boiler plate, just make sure it doesnt break everything
				// 	const something = getSomething(req)
				// 	return { something }
				// },
			}
		});
	await server.start();
	server.applyMiddleware({app}); //todo: apply cors here if needed

	await new Promise(resolve => app.listen({ port: 4000 }, resolve));
		console.log(`🚀 Neo4J Server ready at http://localhost:4000${server.graphqlPath}`);
	});
}
//////////////////////////////////////////////////////////////////////////////////////////// END SETUP OVERHEAD


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
			const filter = {key: req.query.key}; //todo: must be processed in this way for axios request
			//const filter = {key: req.body.key} //this way works for postman testing
			const searchResult = await mongoSchema.find(filter, function(err, result){
				if (!err) {
					res.json(result);
				} else {
					throw err;
				}
			}).clone().catch(function (err) {console.log(err)
			})
		});

		app.get('/payroll/findByStartTime',cors(), async (req, res) => {
			const filter = {key: req.body.key};
			await mongoSchema.findOne(filter, function(err, result){
				if (!err) {
					for(let i=0; i<result.onClockObjects.length; i++) {
						if (result.onClockObjects[i].startTime === req.body.onClockObjects.startTime) {
							res.json(result.onClockObjects[i]);
							return
						}
					}
					res.json("start time did not exist for this key");
				} else {
					throw err;
				}
			}).clone().catch(function (err) {console.log(err)
			})
		});


/////////////////////////////////////////// POST METHODS
		app.post('/payroll/clockIn',
			cors(),
			async (req, res) => {
				const filter = {key: req.body.key}
				await mongoSchema.exists(filter, async function (err, result) {
					if (!err) {
						if (result) { //if key does exist, then check for duplicate start time
							const userFound = await mongoSchema.findOne({key: req.body.key});
							if(userFound.onClockObjects.find(({ startTime }) => startTime === req.body.onClockObjects.startTime)){//blocks duplicate start times
								res.send("you have already clocked in at this time: "+req.body.onClockObjects.startTime);
								return
							}else{
								userFound.onClockObjects.push(req.body.onClockObjects);//if key exists, and there is not already a start time for this time
								await userFound.save();
								res.send("successfully updated existing entry: " + req.body.key);
							}
						} else { //if key does not yet exist, create key and populate with data from request as this is fist clockIN
							const clockIn = await mongoSchema.create({
								key: req.body.key,
								email: req.body.email,
								projectId: req.body.projectId,
								date: req.body.date,
								onClockObjects: req.body.onClockObjects
							});
							res.send("successfully added new entry: " + req.body.key + " to database");
						}
					} else {
						throw err;
					}

				})
			})

/////////////////////////////////////////// PUT METHODS
		app.put('/payroll/updateByStartTime',cors(), async (req, res) => {
			const filter = {key: req.body.key};
			await mongoSchema.findOne(filter, async function (err, result) {
				if (!err) {
					//todo: need error checking for empty array={} findOne() result, shouldn't happen anyway though
					for (let i = 0; i < result.onClockObjects.length; i++) {
						console.log("currently: "+result.onClockObjects[i].startTime);
						if (result.onClockObjects[i].startTime === req.body.startTimeToFind) {
							result.onClockObjects[i].startTime=req.body.onClockObjects.startTime;
							result.onClockObjects[i].stopTime=req.body.onClockObjects.stopTime;
							result.onClockObjects[i].totalHours=req.body.onClockObjects.totalHours;
							result.onClockObjects[i].description=req.body.onClockObjects.description;
							await result.save();
							res.json("successfully updated start time of : "+req.body.onClockObjects.startTime);
							return
						}
					}
					res.json("start time did not exist for this key, could not update");
				} else {
					throw err;
				}
			}).clone().catch(function (err) {console.log(err)
			})
		});


/////////////////////////////////////////// DELETE METHODS
app.delete('/payroll/deleteByStartTime',cors(), async (req, res) => {
	const filter = {key: req.body.key};
	await mongoSchema.findOne(filter, async function (err, result) {
		if (!err) {
			for (let i = 0; i < result.onClockObjects.length; i++) {
				if (result.onClockObjects[i].startTime === req.body.onClockObjects.startTime) {
					result.onClockObjects.splice(i, 1);
					await result.save();
					res.json("successfully removed start time of : "+req.body.onClockObjects.startTime);
					return
				}
			}
			res.json("start time did not exist for this key");
		} else {
			throw err;
		}
	}).clone().catch(function (err) {console.log(err)
	})
});

app.delete('/payroll/deleteByKey',
	cors(),
	async (req, res) => {
		const filter = {key: req.body.key}
		await mongoSchema.exists(filter, async function (err, result) {
			if (!err) {
				if (result) {
					mongoSchema.deleteOne({ key: req.body.key }).then(function(){
						res.send("successfully delete existing entry: " + req.body.key);
					}).catch(function(error){
					});
				} else {
					res.send("entry: " + req.body.key + "did NOT exist, could not delete");
				}
			} else {
				throw err;
			}

		})
	})