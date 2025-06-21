export async function onRequest(context) {
  // context.params.id will contain the id from the URL, e.g. if the route is /api/123, id will be "123"
  const { id } = context.params;

  if (!id) {
    return new Response('ID is required in the URL path, for example: /api/YOUR_PROJECT_ID', { status: 400 });
  }

  // This is the GraphQL query provided.
  const query = `
    query SELECT_PROJECT($id: ID!, $groupId: ID) {
        project(id: $id, groupId: $groupId) {
            id
            name
            user {
                id
                nickname
                profileImage {
                    id
                    name
                    label {
                        ko
                        en
                        ja
                        vn
                    }
                    filename
                    imageType
                    dimension {
                        width
                        height
                    }
                    trimmed {
                        filename
                        width
                        height
                    }
                }
                status {
                    following
                    follower
                }
                description
                role
                mark {
                    id
                    name
                    label {
                        ko
                        en
                        ja
                        vn
                    }
                    filename
                    imageType
                    dimension {
                        width
                        height
                    }
                    trimmed {
                        filename
                        width
                        height
                    }
                }
            }
            thumb
            isopen
            showComment
            blamed
            isPracticalCourse
            category
            categoryCode
            created
            updated
            special
            isForLecture
            isForStudy
            isForSubmit
            hashId
            complexity
            staffPicked
            ranked
            visit
            likeCnt
            comment
            favorite
            shortenUrl
            parent {
                id
                name
                user {
                    id
                    nickname
                }
            }
            description
            description2
            description3
            hasRealTimeVariable
            blockCategoryUsage
            childCnt
            commentGroup {
                group
                count
            }
            likeCntGroup {
                group
                count
            }
            visitGroup {
                group
                count
            }
            recentGroup {
                group
                count
            }
            published
            isFirstPublish
            tags
            speed
            objects
            variables
            submitId {
                id
            }
            cloudVariable
            messages
            functions
            tables
            scenes
            realTimeVariable {
                variableType
                key
                value
                array {
                    key
                    data
                }
                minValue
                maxValue
                visible
                x
                y
                width
                height
                object
            }
            learning
            expansionBlocks
            aiUtilizeBlocks
            hardwareLiteBlocks
            blockCategoryUsage
        }
     }
  `;

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
        // This CSRF token might be temporary. If the API stops working, this might be the reason.
        "csrf-token": "qu1vxobS-bFB2mfJS3y5kdpx-4ebn9BJPyMI", 
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-client-type": "Client"
      },
      referrer: `https://playentry.org/iframe/${id}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify(requestBody),
      credentials: "include"
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
    
    // Set CORS headers to allow cross-origin requests
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