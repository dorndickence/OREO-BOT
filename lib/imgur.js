import { ImgurClient } from 'imgur';

// CommonJS syntax
const { ImgurClient } = require('imgur');

// browser script include
const client = new imgur({ clientId: 'a0113354926015a'});



async function uploadtoimgur(imagepath) {
  try {
    const response = await client.upload({
      image: fs.createReadStream(imagepath),
      type: 'stream',
    })

    let url = response.data.link
    console.log(url)
    return url
  } catch (error) {
    console.error('Error uploading image to Imgur:', error)
    throw error
  }
}

export default uploadtoimgur
