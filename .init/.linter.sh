#!/bin/bash
cd /home/kavia/workspace/code-generation/quickdraw-duel-106954-2235fea4/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

