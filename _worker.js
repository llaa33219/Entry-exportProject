// _worker.js

// The GraphQL query remains the same.
const query = `
    query SELECT_PROJECT($id: ID!, $groupId: ID) {
        project(id: $id, groupId: $groupId) {
            id, name, user { id, nickname, profileImage { id, name, label { ko, en, ja, vn }, filename, imageType, dimension { width, height }, trimmed { filename, width, height } }, status { following, follower }, description, role, mark { id, name, label { ko, en, ja, vn }, filename, imageType, dimension { width, height }, trimmed { filename, width, height } } }, thumb, isopen, showComment, blamed, isPracticalCourse, category, categoryCode, created, updated, special, isForLecture, isForStudy, isForSubmit, hashId, complexity, staffPicked, ranked, visit, likeCnt, comment, favorite, shortenUrl, parent { id, name, user { id, nickname } }, description, description2, description3, hasRealTimeVariable, blockCategoryUsage, childCnt, commentGroup { group, count }, likeCntGroup { group, count }, visitGroup { group, count }, recentGroup { group, count }, published, isFirstPublish, tags, speed, objects, variables, submitId { id }, cloudVariable, messages, functions, tables, scenes, realTimeVariable { variableType, key, value, array { key, data }, minValue, maxValue, visible, x, y, width, height, object }, learning, expansionBlocks, aiUtilizeBlocks, hardwareLiteBlocks, blockCategoryUsage
        }
    }
`;

// Helper function to handle the API logic
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Check if the request is for our API route, e.g. /api/some-id
  if (pathParts.length < 3 || pathParts[1] !== 'api') {
    return new Response('Not Found', { status: 404 });
  }

  const id = pathParts[2];

  if (!id) {
    return new Response('Project ID is required.', { status: 400 });
  }

  let csrfToken;
  try {
    // Step 1: Fetch the initial project page HTML
    const projectPageUrl = `https://playentry.org/project/${id}`;
    const pageResponse = await fetch(projectPageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!pageResponse.ok) {
        return new Response(`Failed to fetch project page. Status: ${pageResponse.status}`, { status: 502 });
    }
    const pageHtml = await pageResponse.text();
    
    // Step 2: Find the main project script file from the HTML
    const scriptRegex = /<script src="(\/js\/dist\/project\.[a-f0-9]+\.js)">/;
    const scriptMatch = pageHtml.match(scriptRegex);

    if (!scriptMatch || !scriptMatch[1]) {
        return new Response('Could not find project script file in the HTML.', { status: 500 });
    }

    const scriptUrl = `https://playentry.org${scriptMatch[1]}`;

    // Step 3: Fetch the script file
    const scriptResponse = await fetch(scriptUrl);
    if (!scriptResponse.ok) {
        return new Response(`Failed to fetch script file. Status: ${scriptResponse.status}`, { status: 502 });
    }
    const scriptContent = await scriptResponse.text();

    // Step 4: Extract the CSRF token from the script content
    const tokenRegex = /window\.__CSRF_TOKEN__="([^"]+)"/;
    const tokenMatch = scriptContent.match(tokenRegex);

    if (tokenMatch && tokenMatch[1]) {
      csrfToken = tokenMatch[1];
    } else {
      return new Response('Could not find CSRF token in the project script.', { status: 500 });
    }
  } catch (error) {
    return new Response(`An error occurred while fetching the CSRF token: ${error.message}`, { status: 500 });
  }

  const requestBody = {
    query,
    variables: { id },
  };

  try {
    const response = await fetch("https://playentry.org/graphql/SELECT_PROJECT", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "ja,en-US;q=0.9,en;q=0.8,ko;q=0.7",
        "content-type": "application/json",
        "csrf-token": csrfToken,
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-client-type": "Client",
        "Referer": `https://playentry.org/iframe/${id}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Error from Entry API: ${response.status} ${response.statusText}\n${errorText}`, { status: 502 });
    }

    const responseData = await response.json();

    if (responseData.errors) {
      return new Response(JSON.stringify(responseData.errors), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const projectData = responseData?.data?.project;

    if (!projectData) {
      return new Response('Project data not found in the response from Entry API.', { status: 404 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    return new Response(JSON.stringify(projectData, null, 2), { headers });

  } catch (error) {
    return new Response(`An unexpected error occurred: ${error.message}`, { status: 500 });
  }
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Check if the request is for an API call
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request);
    }

    // For non-API requests, we assume you want to serve the index.html page
    // In a more complex app, you might have more sophisticated static asset handling.
    // For this simple case, we'll just return the contents of index.html which we need to fetch first or have its content here.
    // Since we don't have access to the file system directly in the deployed worker in this manner, 
    // we'll respond with a simple message for the root.
    // The static assets should be handled by Cloudflare Pages itself when `public` directory is configured.
    // If _worker.js is in the root, it takes precedence.
    
    // A simple landing page message for the root URL.
    if (url.pathname === '/') {
       return new Response("Welcome to the Entry API. Use /api/{project-id} to fetch project data.", {
         headers: { 'Content-Type': 'text/plain' }
       });
    }
    
    // Let Cloudflare Pages handle static assets if configured in the project settings.
    // If you have a `public` folder, Pages will serve from it for routes not handled here.
    // However, if `_worker.js` is in the root, it intercepts ALL requests.
    // A request to env.ASSETS.fetch(request) would be needed if you had a separate static assets folder configured.
    // Since the user wants _worker.js in the root, we'll keep it simple. Let's assume static assets are deployed separately
    // or we can serve them from the worker.
    
    return new Response('Not Found', { status: 404 });
  }
}; 