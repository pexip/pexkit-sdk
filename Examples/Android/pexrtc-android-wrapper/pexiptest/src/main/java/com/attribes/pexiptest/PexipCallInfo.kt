package com.attribes.pexiptest

import java.io.Serializable
import java.util.*

open class PexipCallInfo : Serializable {

    var alias :  String ? = null
    var domain : String ? = null
    var pin : String ? = null
}