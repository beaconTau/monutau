#! /bin/bash

raw_dir=$1
grep '.*gz*$' last_sync > last_files
while read p;  
do 
  d=`dirname ${p}`
  echo ${raw_dir}/${d}; 
  touch ${raw_dir}/${d}; 
done < last_files


