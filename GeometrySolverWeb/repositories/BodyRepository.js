const BodyModel = require('./BodyModel');
const userModel = require('./UserModel');

class BodyRepository
{
  
  constructor() {}

  async createBody(bodyData) 
  {
    try 
    {
      const body = await BodyModel.create(bodyData);
      return body;
    }
    catch(error) 
    {
      throw error;
    }
  }

  async addComment(id, comment)
  {
    try
    {
      const filter = {_id: id};
      const update = { $push: { comments: comment } };
      const result = await BodyModel.updateOne(filter, update);

      if(result.modifiedCount === 1)
        {
          return comment;
        }
        else
        {
          console.log("nothing happened...");
        }
    }
    catch(error)
    {
      throw error;
    }
  }

  async addFigure(id, figure)
  {
    try
    {
      const filter = {_id: id};
      const update = { $push: { figures: figure } };
      await BodyModel.updateOne(filter, {$inc: {length:1}})
      const result = await BodyModel.updateOne(filter, update);
      const duzina = await BodyModel.findById(id);

      if(result.modifiedCount === 1)
        {
          return duzina;
        }
        else
        {
          console.log("nothing happened...");
        }
      }
      catch(error)
      {
        throw error;
      }
  }

  async deleteFigure(id)
  {
    try
    {
      const filter = {_id: id};
      const update = { $pop: { figures: 1 } };
      await BodyModel.updateOne(filter, {$inc: {length:-1}})
      const result = await BodyModel.updateOne(filter, update);
      const duzina = await BodyModel.findById(id);

      if(result.modifiedCount === 1)
        {
          return duzina;
        }
        else
        {
          console.log("nothing happened...");
        }
    }
    catch(error)
    {
      throw error;
    }
  }

  async getBodyById(id)
  {
    try
    {
      const body = await BodyModel.findById(id);
      return body;
    }
    catch(error)
    {
      throw error;
    }
  }

  async getAllBodies()
  {
    try
    {
      const bodies = await BodyModel.find();
      return bodies;
    }
    catch(error)
    {
      throw error;
    }
  }

  async deleteBody(id)
  {
    try
    {
      const result = await BodyModel.findByIdAndDelete(id);
      return result;
    }
    catch(error)
    {
      throw error;
    }
  }
}

module.exports = new BodyRepository();
