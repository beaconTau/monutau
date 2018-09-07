#!/bin/bash


# specify the time limit for the cron job
#SBATCH --time=00:01:00

# use cron.log and append to it
#SBATCH --output=cron.log
#SBATCH --open-mode=append

# the account, partition, and qos should not be changed
#SBATCH --account=cron-account
#SBATCH --partition=cron
#SBATCH --job-name=monutau_cron
#SBATCH --qos=cron

# Specify a valid cron string for the schedule
# this is every half an hour
SCHEDULE='29,59 * * * *'


#cancel any other script if there is one already
scancel --name monutau 
sbatch -A pi-avieregg -p sandyb monutau.sbatch

# resubmit this script with --begin set to the next scheduled cron time
# next-cron-time is a script that parses a cron schedule string and returns
# the next execution time

sbatch --quiet --begin=$(next-cron-time "$SCHEDULE") -A cron-account -p cron monutau_cron.sbatch
