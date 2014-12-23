## LampStack

To create as an [OpenShift](http://www.openshift.com) application:

    rhc app create lampstack nodejs-0.10 cron mongodb-2.4 -s --from-code=https://github.com/codemiller/lampstack.git
    rhc env set EVENT_DRAW="3.30pm on Thursday" EVENT_CITY="Sydney" -a lampstack
    rhc ssh -a lampstack
    mongo
    db.users.insert({ "id": 1, "username": "username", "password": "password"})
    exit
    exit

