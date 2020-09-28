dart2native dart.dart -o dart_native
chmod +x dart_native
rm -rf outputs
rm -rf csv
mkdir outputs
mkdir csv

for testSet in 0 1 2
do
    dart_native ${testSet}
    echo "dart_native ${testSet}"
    dart dart.dart ${testSet}
    echo "dart_vm ${testSet}"
    node js.js ${testSet}
    echo "js ${testSet}"
done

node print.js